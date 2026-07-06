import { NextRequest } from "next/server";
import { generateText, streamText } from "ai";
import { anthropic } from "@/lib/anthropic";
import { getQuestionModel, getCrawlerModel, getDocumentModel, googleTools, type ModelProvider } from "@/lib/providers";
import { tavilySearch, buildGroqSearchQueries } from "@/lib/tavily";
import type { ResearchDoc } from "@/types/teardown";
import { sleep, getMockResearchDoc } from "@/data/mockPipeline";
import { trackTokens } from "@/lib/tokenTracker";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ── Token budget constants (reduced for cost control) ──────────────────────
const MAX_CRAWLER_TOKENS  = 1500;  // haiku/flash is fast; research summary only
const MAX_DOC_TOKENS      = 5000;  // compact schema fits comfortably
const MAX_SEARCHES        = 3;     // 3 targeted searches covers pricing/funding/reviews
const MAX_SOURCES         = 15;
const COMPRESS_MAX_CHARS  = 4000;  // pass only the most relevant research
const ESTIMATED_OUT_CHARS = 10000;
const CHARS_PER_SEC       = 180;

// ── JSON safety helpers ────────────────────────────────────────────────────
function sanitizeJSONString(text: string): string {
  let inString = false, escape = false, result = "";
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

function recoverTruncatedJSON<T>(json: string): T {
  let depth = 0, inString = false, escape = false;
  let lastSectionEnd = -1;
  // Track depth-3 object ends (sections inside the array) and depth-2 as fallback
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      // depth 2 = just closed a section object inside the sections array
      if (c === "}" && depth === 2) lastSectionEnd = i;
    }
  }

  // Try with all complete sections
  if (lastSectionEnd > 0) {
    const recovered = sanitizeJSONString(json.slice(0, lastSectionEnd + 1)) + '],"sources":[]}';
    try { return JSON.parse(recovered) as T; } catch {}
  }

  // Fallback: try to close whatever is open and salvage partial output
  // Find the last complete field boundary at any depth and brute-force close
  const openBraces = (json.match(/\{/g) ?? []).length - (json.match(/\}/g) ?? []).length;
  const openBrackets = (json.match(/\[/g) ?? []).length - (json.match(/\]/g) ?? []).length;
  if (openBraces > 0 || openBrackets > 0) {
    // Strip trailing partial token (anything after the last complete comma-separated value)
    const trimmed = json.replace(/,?\s*"[^"]*"\s*:\s*[^,}\]]*$/, "")
                        .replace(/,\s*$/, "");
    const close = "}".repeat(Math.max(0, openBraces)) + "]".repeat(Math.max(0, openBrackets));
    const attempt = sanitizeJSONString(trimmed) + close + '],"sources":[]}';
    try { return JSON.parse(attempt) as T; } catch {}
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
    try { return JSON.parse(sanitizeJSONString(text.slice(start, end + 1))) as T; }
    catch { return recoverTruncatedJSON<T>(text.slice(start)); }
  }
  throw new Error("No JSON found in model response");
}

function extractURLs(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)>\]"',]+/g) ?? [];
  return Array.from(new Set(matches)).slice(0, MAX_SOURCES);
}

function extractFindingsShort(domain: string, text: string): string | undefined {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const base = domain.replace("www.", "").split(".")[0];
  const match = sentences.find((s) => s.toLowerCase().includes(base.toLowerCase()) && s.length > 20 && s.length < 200);
  return match ? match.slice(0, 120) + (match.length > 120 ? "…" : ".") : undefined;
}

function compressCrawlerText(text: string): string {
  if (text.length <= COMPRESS_MAX_CHARS) return text;
  return text.slice(0, 7000) + "\n\n[...truncated...]\n\n" + text.slice(-3000);
}

function buildCrawlerPrompt(productName: string, tier1: { dimensions?: string[]; goal?: string }, tier2: Record<string, string | string[]>, userContext: string): string {
  const dims = tier1.dimensions ?? [];
  const dimSearches: string[] = [];
  if (dims.includes("tech")) dimSearches.push(`"${productName}" technical architecture API stack engineering`);
  if (dims.includes("fin"))  dimSearches.push(`"${productName}" funding ARR revenue valuation investors`);
  if (dims.includes("gtm"))  dimSearches.push(`"${productName}" marketing growth channels SEO acquisition`);

  return `Search for "${productName}" and extract key facts. Run ${MAX_SEARCHES} searches:
1. "${productName}" pricing plans funding ARR valuation 2025
2. "${productName}" reviews G2 competitors alternatives market share
3. "${productName}" tech stack customers growth team news 2025
${dimSearches.map((s, i) => `${i + 4}. ${s}`).join("\n")}
${userContext ? `USER CONTEXT: ${userContext}\n` : ""}
Output numbers, names, dates only. No prose. Cover: pricing, funding, reviews, competitors, tech, market size.`;
}

function buildDocPrompt(productName: string, focusAreas: string, tier1: { goal?: string; depth?: string }, tier2Context: string, userContext: string, research: string): string {
  return `Product analyst. Teardown of "${productName}" as raw JSON only — no markdown, no backticks.

RESEARCH:
${research}

FOCUS: ${focusAreas} | goal=${tier1.goal ?? "general"}${userContext ? ` | ${userContext}` : ""}

RULES:
- content: 1 paragraph, 35-50 words, real data only (numbers/names/dates)
- stats: 3 items, real values or "N/A". No placeholders.
- bullets: 3 items, 8-12 words each
- tables: 2-3 rows, all cells filled
- chartData: real estimates, not 0. Mark as "est." if guessing.
- Escape: \\n for newlines, \\" for quotes.

JSON:
{"sections":[
{"id":"exec_summary","title":"Executive Summary","content":"...","keyInsight":"...","stats":[{"label":"Founded","value":"..."},{"label":"Valuation","value":"..."},{"label":"Users","value":"..."}],"bullets":["...","...","..."]},
{"id":"product_ux","title":"Product & UX Analysis","content":"...","keyInsight":"...","stats":[{"label":"G2 Rating","value":"..."},{"label":"App Store","value":"..."},{"label":"Top Issue","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"features","title":"Feature Comparison","headers":["Feature","Free","Pro","Enterprise"],"rows":[["Storage","...","...","..."],["API","...","...","..."],["Support","...","...","..."]]}]},
{"id":"business_model","title":"Business Model & Revenue","content":"...","keyInsight":"...","stats":[{"label":"ARR","value":"..."},{"label":"Model","value":"..."},{"label":"Margin","value":"..."}],"bullets":["...","...","..."],"chartData":[{"id":"rev","type":"pie","title":"Revenue Mix","data":[{"label":"Enterprise","value":50},{"label":"SMB","value":30},{"label":"Self-serve","value":20}]}]},
{"id":"pricing_analysis","title":"Pricing Deep-Dive","content":"...","keyInsight":"...","stats":[{"label":"Free Tier","value":"..."},{"label":"Entry Price","value":"..."},{"label":"Enterprise","value":"Custom"}],"bullets":["...","...","..."],"tables":[{"id":"tiers","title":"Pricing Tiers","headers":["Plan","Price","Key Feature"],"rows":[["Free","$0","..."],["Pro","...","..."],["Enterprise","Custom","..."]]}],"chartData":[{"id":"price_compare","type":"bar","title":"Price vs Competitors ($/mo)","xAxis":"Product","yAxis":"$","unit":"$","data":[{"label":"${productName}","value":10},{"label":"Competitor A","value":12},{"label":"Competitor B","value":8}]}]},
{"id":"gtm_growth","title":"GTM & Growth Strategy","content":"...","keyInsight":"...","stats":[{"label":"Motion","value":"..."},{"label":"Traffic","value":"..."},{"label":"Growth","value":"..."}],"bullets":["...","...","..."],"chartData":[{"id":"growth","type":"line","title":"Growth Trajectory","xAxis":"Year","yAxis":"Scale","data":[{"label":"2022","value":1},{"label":"2023","value":3},{"label":"2024","value":7},{"label":"2025","value":12}]}]},
{"id":"tech_arch","title":"Technical Architecture","content":"...","keyInsight":"...","stats":[{"label":"Cloud","value":"..."},{"label":"Languages","value":"..."},{"label":"API","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"stack","title":"Tech Stack","headers":["Layer","Tech"],"rows":[["Frontend","..."],["Backend","..."],["Database","..."]]}]},
{"id":"market_comp","title":"Market & Competitive Landscape","content":"...","keyInsight":"...","stats":[{"label":"TAM","value":"..."},{"label":"CAGR","value":"..."},{"label":"Top Rival","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"comp","title":"Competitor Snapshot","headers":["Dimension","${productName}","Rival A","Rival B"],"rows":[["Price","...","...","..."],["Free tier","...","...","..."],["Best for","...","...","..."]]}],"chartData":[{"id":"mktshare","type":"pie","title":"Market Share Est.","data":[{"label":"${productName}","value":30},{"label":"Rival A","value":25},{"label":"Others","value":45}]}]},
{"id":"customer_profiles","title":"Customer Profiles & ICP","content":"...","keyInsight":"...","stats":[{"label":"Segment","value":"..."},{"label":"Buyer","value":"..."},{"label":"ACV","value":"..."}],"bullets":["...","...","..."],"chartData":[{"id":"custmix","type":"donut","title":"Customer Mix","data":[{"label":"Enterprise","value":30},{"label":"SMB","value":40},{"label":"Self-serve","value":30}]}]},
{"id":"community","title":"Community & Ecosystem","content":"...","keyInsight":"...","stats":[{"label":"Community","value":"..."},{"label":"Integrations","value":"..."},{"label":"Partners","value":"..."}],"bullets":["...","...","..."]},
{"id":"financials","title":"Financials & Funding","content":"...","keyInsight":"...","stats":[{"label":"Raised","value":"..."},{"label":"Last Round","value":"..."},{"label":"Valuation","value":"..."}],"bullets":["...","...","..."],"tables":[{"id":"rounds","title":"Funding","headers":["Round","Year","Amount"],"rows":[["Seed","...","..."],["Series A","...","..."],["Later","...","..."]]}],"chartData":[{"id":"funding","type":"bar","title":"Funding ($M)","xAxis":"Round","yAxis":"$M","unit":"$M","data":[{"label":"Seed","value":2},{"label":"Series A","value":15},{"label":"Later","value":80}]}]},
{"id":"swot_analysis","title":"SWOT Analysis","content":"Strengths: ...\\n\\nWeaknesses: ...","keyInsight":"...","bullets":["STRENGTH: ...","STRENGTH: ...","WEAKNESS: ...","OPPORTUNITY: ...","THREAT: ..."]},
{"id":"strategic_outlook","title":"Strategic Outlook & Risks","content":"...","keyInsight":"Bull or bear in one sentence","stats":[{"label":"Verdict","value":"..."},{"label":"Risk","value":"..."},{"label":"Catalyst","value":"..."}],"bullets":["...","...","..."]}
],"sources":[{"num":1,"domain":"...","title":"...","url":"https://...","usedIn":"..."},{"num":2,"domain":"...","title":"...","url":"https://...","usedIn":"..."}]}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productName = searchParams.get("product") ?? "Unknown Product";
  const sessionId   = searchParams.get("sessionId") ?? "unknown";
  const tier1Raw    = searchParams.get("tier1") ?? "{}";
  const tier2Raw    = searchParams.get("tier2") ?? "{}";
  const userContext = searchParams.get("userContext") ?? "";
  const modelParam  = (searchParams.get("model") ?? "claude") as ModelProvider;

  let tier1: { dimensions?: string[]; goal?: string; depth?: string } = {};
  let tier2: Record<string, string | string[]> = {};
  try { tier1 = JSON.parse(tier1Raw); } catch {}
  try { tier2 = JSON.parse(tier2Raw); } catch {}

  const focusAreas  = (tier1.dimensions ?? []).join(", ") || "all areas";
  const tier2Context = Object.entries(tier2)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join(" | ");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      try {
        // ── DEMO MODE ──────────────────────────────────────────────────────
        if (DEMO_MODE) {
          send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…` });
          await sleep(1200);
          send({ type: "agent", agent: "Question Agent", status: "done", message: `${productName} confirmed as a software product` });
          send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Searching the web…" });
          send({ type: "sources", crawled: 0, total: 5 });
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
          send({ type: "preview", text: (mockDoc.sections[0]?.content ?? "").split("\n\n").slice(0, 2).join("\n\n") });
          await sleep(1500);
          send({ type: "agent", agent: "Document Agent", status: "done", message: "12 sections generated", progress: 100 });
          send({ type: "done", document: mockDoc });
          return;
        }

        // ── Agent 1: Question Agent ────────────────────────────────────────
        send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…` });

        const questionResult = await generateText({
          model: getQuestionModel(modelParam),
          maxOutputTokens: 60,
          messages: [{ role: "user", content: `In one sentence: what is "${productName}" and its core value prop?` }],
        });

        if (questionResult.usage) {
          await trackTokens(sessionId, productName, "question_agent", questionResult.usage.inputTokens, questionResult.usage.outputTokens);
        }
        send({ type: "agent", agent: "Question Agent", status: "done", message: questionResult.text.split(".")[0].trim() });

        // ── Agent 2: Crawler Agent ─────────────────────────────────────────
        let researchText = "";
        let crawlCount   = 0;
        const seenDomains = new Set<string>();

        const totalSources = MAX_SEARCHES;
        send({ type: "agent", agent: "Crawler Agent", status: "running", message: `Searching across ${totalSources} sources…` });
        send({ type: "sources", crawled: 0, total: totalSources });

        // ── GROQ PATH: Tavily search ─────────────────────────────────────
        if (modelParam === "groq") {
          const queries = buildGroqSearchQueries(productName);
          const allResults: Array<{ url: string; title: string; content: string }> = [];

          for (const query of queries) {
            const results = await tavilySearch(query, 3);
            for (const r of results) {
              if (crawlCount >= MAX_SOURCES) break;
              try {
                const domain = new URL(r.url).hostname.replace("www.", "");
                if (!seenDomains.has(domain)) {
                  seenDomains.add(domain);
                  crawlCount++;
                  send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: r.title });
                  send({ type: "sources", crawled: crawlCount, total: totalSources });
                  allResults.push(r);
                }
              } catch {}
            }
          }

          // Pass Tavily results directly — no Groq synthesis step to preserve token budget
          const tavilyContext = allResults
            .map((r) => `SOURCE: ${r.url}\nTITLE: ${r.title}\nSNIPPET: ${r.content}`)
            .join("\n\n---\n\n");

          researchText = tavilyContext || `Limited search results available for ${productName}.`;

        // ── GEMINI PATH: Google Search grounding ─────────────────────────
        } else if (modelParam === "gemini") {
          const crawlerPrompt = buildCrawlerPrompt(productName, tier1, tier2, userContext);
          const geminiCrawler = streamText({
            model: getCrawlerModel("gemini"),
            maxOutputTokens: MAX_CRAWLER_TOKENS,
            prompt: crawlerPrompt,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tools: { google_search: googleTools.googleSearch({}) as any },
          });

          for await (const part of geminiCrawler.fullStream) {
            if (part.type === "text-delta") {
              researchText += part.text;
            } else if (part.type === "source") {
              const src = part as { url?: string; title?: string };
              if (src.url && crawlCount < MAX_SOURCES) {
                try {
                  const domain = new URL(src.url).hostname.replace("www.", "");
                  if (!seenDomains.has(domain)) {
                    seenDomains.add(domain);
                    crawlCount++;
                    send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: src.title?.slice(0, 120) });
                    send({ type: "sources", crawled: crawlCount, total: totalSources });
                  }
                } catch {}
              }
            }
          }

          // Fallback: extract from Google grounding metadata if no source events came
          if (crawlCount === 0) {
            const meta = await geminiCrawler.providerMetadata;
            type GoogleMeta = { groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string | null } }> } };
            const chunks = (meta?.google as GoogleMeta | undefined)?.groundingMetadata?.groundingChunks ?? [];
            for (const chunk of chunks) {
              if (!chunk.web?.uri || crawlCount >= MAX_SOURCES) continue;
              try {
                const domain = new URL(chunk.web.uri).hostname.replace("www.", "");
                if (!seenDomains.has(domain)) {
                  seenDomains.add(domain);
                  crawlCount++;
                  send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: chunk.web.title?.slice(0, 120) ?? undefined });
                  send({ type: "sources", crawled: crawlCount, total: totalSources });
                }
              } catch {}
            }
          }

          const geminiUsage = await geminiCrawler.usage;
          if (geminiUsage) {
            await trackTokens(sessionId, productName, "crawler_agent", geminiUsage.inputTokens, geminiUsage.outputTokens);
          }

        // ── CLAUDE PATH: Anthropic native web search ──────────────────────
        } else {
          const crawlerPrompt = buildCrawlerPrompt(productName, tier1, tier2, userContext);
          const claudeCrawler = streamText({
            model: anthropic("claude-haiku-4-5-20251001"),
            maxOutputTokens: MAX_CRAWLER_TOKENS,
            tools: { webSearch: anthropic.tools.webSearch_20250305({ maxUses: MAX_SEARCHES }) },
            messages: [{ role: "user", content: crawlerPrompt }],
          });

          for await (const part of claudeCrawler.fullStream) {
            if (part.type === "text-delta") {
              researchText += part.text;
            } else if (part.type === "source") {
              const src = part as { url?: string; title?: string };
              if (src.url && crawlCount < MAX_SOURCES) {
                try {
                  const domain = new URL(src.url).hostname.replace("www.", "");
                  if (!seenDomains.has(domain)) {
                    seenDomains.add(domain);
                    crawlCount++;
                    send({ type: "crawl", url: domain, message: `Indexed ${domain}`, findings: src.title?.slice(0, 120) });
                    send({ type: "sources", crawled: crawlCount, total: totalSources });
                  }
                } catch {}
              }
            }
          }

          // Fallback: regex URL extraction
          if (crawlCount === 0) {
            extractURLs(researchText).forEach((url, i) => {
              try {
                const domain = new URL(url).hostname.replace("www.", "");
                send({ type: "crawl", url: domain, message: `Fetched ${domain}`, findings: extractFindingsShort(domain, researchText) });
                send({ type: "sources", crawled: i + 1, total: MAX_SEARCHES });
              } catch {}
            });
          }

          const claudeUsage = await claudeCrawler.usage;
          if (claudeUsage) {
            await trackTokens(sessionId, productName, "crawler_agent", claudeUsage.inputTokens, claudeUsage.outputTokens);
          }
        }

        send({ type: "agent", agent: "Crawler Agent", status: "done", message: `Pulled data from ${crawlCount || "multiple"} sources` });

        // ── Agent 3: Document Agent ────────────────────────────────────────
        const estSec   = Math.round(ESTIMATED_OUT_CHARS / CHARS_PER_SEC);
        const etaMin   = Math.floor(estSec / 60);
        const etaSec   = estSec % 60;
        const etaStr   = etaMin > 0 ? `~${etaMin}m ${etaSec}s` : `~${estSec}s`;

        send({ type: "agent", agent: "Document Agent", status: "running",
          message: `Building 12-section report (est. ${etaStr})…`, progress: 0 });

        const compressedResearch = compressCrawlerText(researchText);
        const docPrompt = buildDocPrompt(productName, focusAreas, tier1, tier2Context, userContext, compressedResearch);

        const docStream = streamText({
          model: getDocumentModel(modelParam),
          maxOutputTokens: MAX_DOC_TOKENS,
          messages: [{ role: "user", content: docPrompt }],
        });

        let docText = "";
        const docStartTime  = Date.now();
        let lastProgressAt  = Date.now();

        try {
          for await (const chunk of docStream.textStream) {
            docText += chunk;
            const now = Date.now();
            if (now - lastProgressAt >= 2000) {
              lastProgressAt = now;
              const elapsed   = Math.max(1, (now - docStartTime) / 1000);
              const cps       = docText.length / elapsed;
              const remaining = cps > 0 ? Math.max(0, Math.round((ESTIMATED_OUT_CHARS - docText.length) / cps)) : 0;
              const pct       = Math.min(95, Math.round((docText.length / ESTIMATED_OUT_CHARS) * 100));
              const remStr    = remaining > 60 ? `~${Math.ceil(remaining / 60)}m remaining`
                              : remaining > 0  ? `~${remaining}s remaining`
                              : "almost done…";
              send({ type: "agent", agent: "Document Agent", status: "running",
                message: `Writing ${pct}% · ${remStr}`, progress: pct });
            }
          }
        } catch (streamErr) {
          // Surface the real model error rather than the SDK's generic wrapper
          throw new Error(
            `Document Agent stream failed: ${streamErr instanceof Error ? streamErr.message : String(streamErr)}`
          );
        }

        if (!docText.trim()) {
          throw new Error("Document Agent returned an empty response. The model may be rate-limited or the prompt was rejected. Please retry.");
        }

        try {
          const docUsage = await docStream.usage;
          if (docUsage) {
            await trackTokens(sessionId, productName, "document_agent", docUsage.inputTokens, docUsage.outputTokens);
          }
        } catch { /* usage tracking failure is non-fatal */ }

        const docData = extractJSON<ResearchDoc>(docText);

        const execSection = docData.sections?.find((s) => s.id === "exec_summary");
        if (execSection?.content) {
          send({ type: "preview", text: execSection.content.split("\n\n").slice(0, 2).join("\n\n") });
        }

        send({ type: "agent", agent: "Document Agent", status: "done",
          message: `${docData.sections?.length ?? 12} sections generated`, progress: 100 });
        send({ type: "done", document: docData });

      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        let friendly = raw;
        if (raw.toLowerCase().includes("quota") || raw.toLowerCase().includes("rate limit") || raw.toLowerCase().includes("exceeded")) {
          const model = modelParam === "gemini" ? "Gemini Flash" : modelParam === "groq" ? "Groq / Llama" : "Claude";
          friendly = `${model} API quota exceeded. Please switch to a different model on the home screen and try again, or wait a few minutes before retrying.`;
        } else if (raw.toLowerCase().includes("api key") || raw.toLowerCase().includes("authentication") || raw.toLowerCase().includes("unauthorized")) {
          friendly = `API key error for the selected model. Check your .env file and make sure the key is valid.`;
        }
        send({ type: "error", message: friendly });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache",
      "Connection":      "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
