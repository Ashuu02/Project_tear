import { NextRequest } from "next/server";
import { generateText, streamText } from "ai";
import { anthropic } from "@/lib/anthropic";
import type { ResearchDoc } from "@/types/teardown";
import { sleep, getMockResearchDoc } from "@/data/mockPipeline";
import { trackTokens } from "@/lib/tokenTracker";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Fix unescaped control chars inside JSON strings (common LLM output issue)
function sanitizeJSONString(text: string): string {
  let inString = false;
  let escape = false;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { result += c; escape = false; continue; }
    if (c === "\\" && inString) { result += c; escape = true; continue; }
    if (c === '"') { inString = !inString; result += c; continue; }
    if (inString) {
      if (c === "\n") { result += "\\n"; continue; }
      if (c === "\r") { result += "\\r"; continue; }
      if (c === "\t") { result += "\\t"; continue; }
    }
    result += c;
  }
  return result;
}

// Recover truncated JSON by finding last complete section object
function recoverTruncatedJSON<T>(json: string): T {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastSectionEnd = -1;

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      // depth 2: root obj { ... "sections": [ ... {section} ... ] ... }
      if (c === "}" && depth === 2) lastSectionEnd = i;
    }
  }

  if (lastSectionEnd > 0) {
    const recovered = sanitizeJSONString(json.slice(0, lastSectionEnd + 1)) + '],"sources":[]}';
    try { return JSON.parse(recovered) as T; } catch {}
  }
  throw new Error("JSON recovery failed — output was truncated too early");
}

function extractJSON<T>(text: string): T {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(sanitizeJSONString(codeBlock[1].trim())) as T; } catch {}
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(sanitizeJSONString(text.slice(start, end + 1))) as T;
    } catch {
      return recoverTruncatedJSON<T>(text.slice(start));
    }
  }
  throw new Error("No JSON found in model response");
}

function extractURLs(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)>\]"',]+/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 12);
}

function buildTargetedSearchTerms(
  productName: string,
  tier1: { dimensions?: string[]; goal?: string },
  tier2: Record<string, string | string[]>
): string {
  const dims = tier1.dimensions ?? [];
  const extra: string[] = [];
  if (dims.includes("tech")) extra.push(`"${productName}" engineering blog technical architecture stack API`);
  if (dims.includes("fin")) extra.push(`"${productName}" funding round valuation ARR revenue growth Crunchbase PitchBook`);
  if (dims.includes("gtm")) extra.push(`"${productName}" marketing strategy growth channels SEO paid acquisition`);
  if (dims.includes("comm")) extra.push(`"${productName}" community Reddit Discord users sentiment reviews`);
  if (dims.includes("biz")) extra.push(`"${productName}" business model pricing revenue monetization`);
  if (dims.includes("ux")) extra.push(`"${productName}" user experience onboarding reviews usability`);
  const category = tier2.product_category;
  if (category === "b2b_saas") extra.push(`"${productName}" enterprise customers G2 Gartner Magic Quadrant`);
  if (category === "dev_tool") extra.push(`"${productName}" GitHub stars developers API documentation`);
  if (category === "ai_native") extra.push(`"${productName}" AI model training data benchmark performance`);
  return extra.join("\n");
}

function extractFindingsShort(domain: string, researchText: string): string | undefined {
  const sentences = researchText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const base = domain.replace("www.", "").split(".")[0];
  const match = sentences.find((s) => s.toLowerCase().includes(base.toLowerCase()) && s.length > 20 && s.length < 200);
  return match ? match.slice(0, 120) + (match.length > 120 ? "…" : ".") : undefined;
}

function compressCrawlerText(text: string, maxChars = 12000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, 9000) + "\n\n[...truncated...]\n\n" + text.slice(-3000);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productName = searchParams.get("product") ?? "Unknown Product";
  const sessionId   = searchParams.get("sessionId") ?? "unknown";
  const tier1Raw    = searchParams.get("tier1") ?? "{}";
  const tier2Raw    = searchParams.get("tier2") ?? "{}";
  const userContext = searchParams.get("userContext") ?? "";

  let tier1: { dimensions?: string[]; goal?: string; depth?: string } = {};
  let tier2: Record<string, string | string[]> = {};
  try { tier1 = JSON.parse(tier1Raw); } catch {}
  try { tier2 = JSON.parse(tier2Raw); } catch {}

  const focusAreas = (tier1.dimensions ?? []).join(", ") || "all areas";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      try {
        // ── DEMO MODE ────────────────────────────────────────────────────────
        if (DEMO_MODE) {
          send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…` });
          await sleep(1200);
          send({ type: "agent", agent: "Question Agent", status: "done", message: `${productName} confirmed as a software product` });
          send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Searching the web…" });
          send({ type: "sources", crawled: 0, total: 5 });
          await sleep(700);
          const mockDomains = ["notion.so", "techcrunch.com", "g2.com", "reddit.com", "bloomberg.com"];
          for (let i = 0; i < mockDomains.length; i++) {
            await sleep(550);
            send({ type: "crawl", url: mockDomains[i], message: `Fetched ${mockDomains[i]}`, findings: `Found key product data at ${mockDomains[i]}.` });
            send({ type: "sources", crawled: i + 1, total: 5 });
          }
          send({ type: "agent", agent: "Crawler Agent", status: "done", message: "Pulled data from 5 sources" });
          send({ type: "agent", agent: "Document Agent", status: "running", message: "Synthesizing research document…", progress: 0 });
          await sleep(2000);
          const mockDoc = getMockResearchDoc(productName);
          const previewContent = mockDoc.sections[0]?.content ?? "";
          send({ type: "preview", text: previewContent.split("\n\n").slice(0, 2).join("\n\n") });
          await sleep(1500);
          send({ type: "agent", agent: "Document Agent", status: "done", message: "12 sections generated", progress: 100 });
          send({ type: "done", document: mockDoc });
          return;
        }

        // ── Agent 1: Question Agent ──────────────────────────────────────────
        send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…` });

        const questionResult = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 200,
          messages: [{
            role: "user",
            content: `Confirm "${productName}" is a real software product. Return 1-2 sentences: what it is and its core value proposition.`,
          }],
        });

        if (questionResult.usage) {
          await trackTokens(sessionId, productName, "question_agent", questionResult.usage.inputTokens, questionResult.usage.outputTokens);
        }

        send({ type: "agent", agent: "Question Agent", status: "done", message: questionResult.text.split(".")[0].trim() });

        // ── Agent 2: Crawler Agent — real-time source streaming ──────────────
        send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Running targeted research across 10 sources…" });
        send({ type: "sources", crawled: 0, total: 10 });

        const additionalSearchTerms = buildTargetedSearchTerms(productName, tier1, tier2);

        const crawlerPrompt = `You are a product research analyst. Research "${productName}" using web search. Execute the following searches in order.

MANDATORY SEARCHES:
1. "${productName}" official pricing plans features 2024 2025 → exact plan names, prices, limits
2. "${productName}" revenue ARR funding valuation crunchbase → total raised, last round, valuation
3. "${productName}" G2 Capterra Trustpilot reviews rating → rating, top pros/cons, NPS
4. "${productName}" competitors vs alternatives 2024 → top 3-5 rivals, differentiation, pricing
5. "${productName}" customers case studies enterprise growth → logos, ACV, customer count
6. "${productName}" market size TAM industry forecast 2024 2026 → TAM, CAGR, segments
7. "${productName}" founders team employees Glassdoor → founder names, headcount, culture
8. "${productName}" technical architecture stack integrations API → tech stack, cloud, languages
9. "${productName}" reddit community discussion sentiment 2024 → community size, sentiment
10. "${productName}" news announcements roadmap 2024 2025 → recent launches, milestones
${additionalSearchTerms ? `\nADDITIONAL:\n${additionalSearchTerms}` : ""}
${userContext ? `\nUSER CONTEXT (primary signal):\n${userContext}` : ""}

SOURCE PRIORITY: Official site > SEC/Crunchbase/PitchBook > TechCrunch/Bloomberg > G2/Capterra > Reddit/HackerNews

OUTPUT (structured report, NOT prose):
## PRICING & PLANS
## FINANCIALS & FUNDING
## USER REVIEWS & SENTIMENT
## COMPETITIVE LANDSCAPE
## CUSTOMERS & ICP
## MARKET & INDUSTRY
## TEAM & COMPANY
## TECHNICAL STACK
## COMMUNITY & ECOSYSTEM
## RECENT NEWS & ROADMAP
## ALL SOURCES [list every URL found]

Use exact numbers, dates, percentages. Mark estimates as "est."`;

        const crawlerStream = streamText({
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 6000,
          tools: {
            webSearch: anthropic.tools.webSearch_20250305({ maxUses: 10 }),
          },
          messages: [{ role: "user", content: crawlerPrompt }],
        });

        let crawlCount = 0;
        let researchText = "";
        const seenDomains = new Set<string>();

        for await (const part of crawlerStream.fullStream) {
          if (part.type === "text-delta") {
            researchText += part.text;
          } else if (part.type === "source") {
            const src = part as { type: string; url?: string; title?: string; sourceType?: string };
            if (src.url) {
              try {
                const domain = new URL(src.url).hostname.replace("www.", "");
                if (!seenDomains.has(domain)) {
                  seenDomains.add(domain);
                  crawlCount++;
                  const findings = src.title ? String(src.title).slice(0, 120) : undefined;
                  send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings });
                  send({ type: "sources", crawled: crawlCount, total: 10 });
                }
              } catch {}
            }
          }
        }

        // Fallback: extract URLs from text if no source events fired
        if (crawlCount === 0) {
          const urls = extractURLs(researchText);
          urls.forEach((url, i) => {
            try {
              const domain = new URL(url).hostname.replace("www.", "");
              const findings = extractFindingsShort(domain, researchText);
              send({ type: "crawl", url: domain, message: `Fetched ${domain}`, findings });
              send({ type: "sources", crawled: i + 1, total: Math.max(urls.length, 5) });
            } catch {}
          });
          crawlCount = urls.length;
        }

        const crawlerUsage = await crawlerStream.usage;
        if (crawlerUsage) {
          await trackTokens(sessionId, productName, "crawler_agent", crawlerUsage.inputTokens, crawlerUsage.outputTokens);
        }

        send({ type: "agent", agent: "Crawler Agent", status: "done", message: `Pulled data from ${crawlCount || "multiple"} sources` });

        // ── Agent 3: Document Agent — streamed with live progress ────────────
        const ESTIMATED_OUTPUT_CHARS = 22000;
        const CHARS_PER_SEC = 200; // Sonnet streams ~200 chars/sec
        const estimatedSec = Math.round(ESTIMATED_OUTPUT_CHARS / CHARS_PER_SEC);
        const etaMin = Math.floor(estimatedSec / 60);
        const etaSec = estimatedSec % 60;
        const etaStr = etaMin > 0 ? `~${etaMin}m ${etaSec}s` : `~${estimatedSec}s`;

        send({ type: "agent", agent: "Document Agent", status: "running",
          message: `Building 12-section report (est. ${etaStr})…`, progress: 0 });

        const tier2Context = Object.entries(tier2)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");

        const compressedResearch = compressCrawlerText(researchText);

        const docPrompt = `You are a senior product analyst. Write a 12-section teardown of "${productName}" as raw JSON only — no markdown, no backticks, no text before or after the JSON object.

RESEARCH DATA (use all specific numbers, names, dates found here):
${compressedResearch}

USER: focus=${focusAreas} | goal=${tier1.goal ?? "general"} | depth=${tier1.depth ?? "standard"}${tier2Context ? ` | ${tier2Context}` : ""}${userContext ? ` | context: ${userContext}` : ""}

OUTPUT RULES:
- content: exactly 2-3 paragraphs per section, each 60-80 words, joined by \\n\\n
- stats: 3-5 items with REAL numbers from research (no 0 placeholders)
- bullets: 4-5 sharp specific takeaways
- tables rows: use REAL competitor names, prices, data
- chartData values: REAL estimated numbers (not 0)
- Escape all special chars in strings: \\" for quotes, \\n for newlines
- Mark unknown estimates as "est."

JSON SCHEMA — produce all 12 sections with this exact structure:
{"sections":[
{"id":"exec_summary","title":"Executive Summary","content":"para1 60-80 words\\n\\npara2 60-80 words\\n\\npara3 optional","keyInsight":"single most important strategic insight","stats":[{"label":"Founded","value":"YEAR"},{"label":"Valuation","value":"$XB","change":"+X% YoY"},{"label":"Customers","value":"XM+"},{"label":"Employees","value":"~X,000"}],"bullets":["key insight 1","key insight 2","key insight 3","key insight 4","key insight 5"]},
{"id":"product_ux","title":"Product & UX Analysis","content":"...","keyInsight":"...","stats":[{"label":"G2 Rating","value":"X.X/5","sub":"X,000 reviews"},{"label":"App Store","value":"X.X/5"},{"label":"Top Complaint","value":"short description"}],"bullets":["...","...","...","..."],"tables":[{"id":"feature_matrix","title":"Core Feature Matrix","headers":["Feature","Free","Pro","Enterprise"],"rows":[["Feature 1","Limited","Full","Custom"],["Feature 2","No","Yes","Yes"],["Feature 3","Basic","Advanced","Unlimited"]]}]},
{"id":"business_model","title":"Business Model & Revenue","content":"...","keyInsight":"...","stats":[{"label":"ARR Estimate","value":"$XM","change":"+X% YoY"},{"label":"Revenue Model","value":"SaaS/Usage/Hybrid"},{"label":"Gross Margin","value":"~XX%"}],"bullets":["...","...","...","..."],"chartData":[{"id":"rev_segments","type":"pie","title":"Revenue by Segment","data":[{"label":"Enterprise","value":55},{"label":"Mid-Market","value":30},{"label":"SMB","value":15}]}]},
{"id":"pricing_analysis","title":"Pricing Deep-Dive","content":"...","keyInsight":"...","stats":[{"label":"Free Tier","value":"Yes/No"},{"label":"Entry Price","value":"$X/mo"},{"label":"Enterprise","value":"Custom/$X+"},{"label":"Price vs Peers","value":"Premium/Parity/Discount"}],"bullets":["...","...","...","..."],"tables":[{"id":"pricing_tiers","title":"Pricing Tier Breakdown","headers":["Plan","Price","Users","Key Features","Target"],"rows":[["Free","$0","1-X","Basic","Individual"],["Pro","$X/mo","Up to X","Advanced","Small teams"],["Business","$X/mo","Unlimited","All + admin","Growing cos"],["Enterprise","Custom","Unlimited","SSO,SLA,compliance","Large orgs"]]}],"chartData":[{"id":"price_compare","type":"bar","title":"Price vs Competitors ($/seat/mo)","xAxis":"Product","yAxis":"Price ($)","unit":"$","data":[{"label":"${productName}","value":0},{"label":"Competitor A","value":0},{"label":"Competitor B","value":0},{"label":"Competitor C","value":0}]}]},
{"id":"gtm_growth","title":"GTM & Growth Strategy","content":"...","keyInsight":"...","stats":[{"label":"GTM Motion","value":"PLG/SLG/Hybrid"},{"label":"Monthly Traffic","value":"X.XM"},{"label":"Primary Channel","value":"..."},{"label":"CAC Estimate","value":"$X,000"}],"bullets":["...","...","...","..."],"chartData":[{"id":"growth","type":"line","title":"Estimated Customer Growth","xAxis":"Year","yAxis":"Customers","data":[{"label":"2020","value":0},{"label":"2021","value":0},{"label":"2022","value":0},{"label":"2023","value":0},{"label":"2024","value":0}]}]},
{"id":"tech_arch","title":"Technical Architecture","content":"...","keyInsight":"...","stats":[{"label":"Cloud Provider","value":"AWS/GCP/Azure/Multi"},{"label":"Primary Language","value":"language"},{"label":"API","value":"REST/GraphQL/None"},{"label":"Integrations","value":"X+ native"}],"bullets":["...","...","...","..."],"tables":[{"id":"tech_stack","title":"Technology Stack","headers":["Layer","Technology","Notes"],"rows":[["Frontend","tech","detail"],["Backend","tech","detail"],["Database","tech","detail"],["Infrastructure","tech","detail"],["AI/ML","tech or N/A","detail"]]}]},
{"id":"market_comp","title":"Market & Competitive Landscape","content":"...","keyInsight":"...","stats":[{"label":"TAM","value":"$XB"},{"label":"CAGR","value":"XX%"},{"label":"Market Position","value":"Leader/Challenger/Niche"},{"label":"Top Competitor","value":"name"}],"bullets":["...","...","...","..."],"tables":[{"id":"comp_matrix","title":"Competitive Comparison Matrix","headers":["Dimension","${productName}","Competitor A","Competitor B","Competitor C"],"rows":[["Price (entry)","$X/mo","$X/mo","$X/mo","$X/mo"],["Free tier","Yes/No","Yes/No","Yes/No","Yes/No"],["Key strength","value","value","value","value"],["Primary weakness","value","value","value","value"],["Best for","segment","segment","segment","segment"]]}],"chartData":[{"id":"mktshare","type":"pie","title":"Estimated Market Share","data":[{"label":"${productName}","value":0},{"label":"Competitor A","value":0},{"label":"Competitor B","value":0},{"label":"Others","value":0}]}]},
{"id":"customer_profiles","title":"Customer Profiles & ICP","content":"...","keyInsight":"...","stats":[{"label":"Primary Segment","value":"Enterprise/SMB/Consumer"},{"label":"Typical Buyer","value":"job title"},{"label":"Avg ACV","value":"$X,000 est."},{"label":"Key Use Case","value":"primary use case"}],"bullets":["...","...","...","..."],"tables":[{"id":"segments","title":"Customer Segment Breakdown","headers":["Segment","Size","Key Needs","Revenue %"],"rows":[["Enterprise","1000+ employees","Security, SSO, compliance","~X%"],["Mid-Market","100-999","Scalability, integrations","~X%"],["SMB","<100","Ease of use, price","~X%"]]}],"chartData":[{"id":"custmix","type":"donut","title":"Customer Mix by Segment","data":[{"label":"Enterprise","value":0},{"label":"Mid-Market","value":0},{"label":"SMB/Self-serve","value":0}]}]},
{"id":"community","title":"Community & Ecosystem","content":"...","keyInsight":"...","stats":[{"label":"Community Size","value":"X,000+ members"},{"label":"GitHub Stars","value":"X,000+"},{"label":"Integrations","value":"X+ apps"},{"label":"Reddit Activity","value":"X,000+ subs"}],"bullets":["...","...","...","..."]},
{"id":"financials","title":"Financials & Funding","content":"...","keyInsight":"...","stats":[{"label":"Total Raised","value":"$XM/$XB"},{"label":"Last Round","value":"Series X — $XM (YEAR)"},{"label":"Lead Investor","value":"name"},{"label":"Valuation","value":"$XB (YEAR)"},{"label":"Est. Runway","value":"X years"}],"bullets":["...","...","...","..."],"tables":[{"id":"rounds","title":"Funding Round History","headers":["Round","Year","Amount","Lead Investor","Valuation"],"rows":[["Seed","YEAR","$XM","investor","$XM"],["Series A","YEAR","$XM","investor","$XM"],["Series B","YEAR","$XM","investor","$XB"]]}],"chartData":[{"id":"funding","type":"bar","title":"Funding Raised by Round ($M)","xAxis":"Round","yAxis":"Amount ($M)","unit":"$M","data":[{"label":"Seed","value":0},{"label":"Series A","value":0},{"label":"Series B","value":0},{"label":"Series C","value":0}]}]},
{"id":"swot_analysis","title":"SWOT Analysis","content":"Strengths: 60-80 words\\n\\nWeaknesses: 60-80 words\\n\\nOpportunities: 60-80 words\\n\\nThreats: 60-80 words","keyInsight":"most important strategic takeaway","bullets":["STRENGTH: specific with evidence","STRENGTH: specific with evidence","WEAKNESS: specific with evidence","WEAKNESS: specific with evidence","OPPORTUNITY: market signal","THREAT: competitive risk"],"tables":[{"id":"swot","title":"SWOT Summary","headers":["Category","Factor","Evidence / Signal"],"rows":[["Strength","S1","evidence"],["Strength","S2","evidence"],["Weakness","W1","evidence"],["Weakness","W2","evidence"],["Opportunity","O1","signal"],["Opportunity","O2","signal"],["Threat","T1","risk"],["Threat","T2","risk"]]}]},
{"id":"strategic_outlook","title":"Strategic Outlook & Risks","content":"...","keyInsight":"bull/bear verdict in one sentence","stats":[{"label":"Outlook","value":"Bullish/Cautious/Bearish"},{"label":"Biggest Risk","value":"description"},{"label":"Biggest Opportunity","value":"description"},{"label":"M&A Target?","value":"Likely/Possible/Unlikely"}],"bullets":["strategic insight 1","insight 2","insight 3","insight 4","insight 5"]}
],"sources":[{"num":1,"domain":"example.com","title":"What was found here","url":"https://example.com","usedIn":"Section Name"},{"num":2,"domain":"crunchbase.com","title":"Funding data","url":"https://crunchbase.com/...","usedIn":"Financials"}]}

Replace ALL placeholder values (X, YEAR, 0, ...) with REAL data from the research above.`;

        const docStream = streamText({
          model: anthropic("claude-sonnet-4-6"),
          maxOutputTokens: 10000,
          messages: [{ role: "user", content: docPrompt }],
        });

        let docText = "";
        const docStartTime = Date.now();
        let lastProgressAt = Date.now();

        for await (const chunk of docStream.textStream) {
          docText += chunk;
          const now = Date.now();
          if (now - lastProgressAt >= 2000) {
            lastProgressAt = now;
            const elapsed = Math.max(1, (now - docStartTime) / 1000);
            const cps = docText.length / elapsed;
            const remaining = cps > 0
              ? Math.max(0, Math.round((ESTIMATED_OUTPUT_CHARS - docText.length) / cps))
              : 0;
            const pct = Math.min(95, Math.round((docText.length / ESTIMATED_OUTPUT_CHARS) * 100));
            const remStr = remaining > 60
              ? `~${Math.ceil(remaining / 60)}m remaining`
              : remaining > 0
              ? `~${remaining}s remaining`
              : "almost done…";
            send({ type: "agent", agent: "Document Agent", status: "running",
              message: `Writing ${pct}% · ${remStr}`, progress: pct });
          }
        }

        const docUsage = await docStream.usage;
        if (docUsage) {
          await trackTokens(sessionId, productName, "document_agent", docUsage.inputTokens, docUsage.outputTokens);
        }

        const docData = extractJSON<ResearchDoc>(docText);

        const execSection = docData.sections?.find((s) => s.id === "exec_summary");
        if (execSection?.content) {
          send({ type: "preview", text: execSection.content.split("\n\n").slice(0, 2).join("\n\n") });
        }

        send({ type: "agent", agent: "Document Agent", status: "done",
          message: `${docData.sections?.length ?? 12} sections generated`, progress: 100 });
        send({ type: "done", document: docData });

      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
