import { NextRequest } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@/lib/anthropic";
import type { ResearchDoc } from "@/types/teardown";
import { sleep, getMockResearchDoc } from "@/data/mockPipeline";
import { trackTokens } from "@/lib/tokenTracker";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function extractJSON<T>(text: string): T {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()) as T; } catch {}
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    return JSON.parse(text.slice(start, end + 1)) as T;
  }
  throw new Error("No JSON found in model response");
}

function extractURLs(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)>\]"',]+/g) ?? [];
  return Array.from(new Set(matches)).slice(0, 12);
}

function extractFindingsForDomain(domain: string, researchText: string): string | undefined {
  const sentences = researchText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const domainBase = domain.replace("www.", "").split(".")[0];
  const match = sentences.find((s) =>
    s.toLowerCase().includes(domainBase.toLowerCase()) && s.length > 20
  );
  return match ? match + "." : undefined;
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

// Compress crawler text to reduce tokens passed to document agent
function compressCrawlerText(text: string, maxChars = 18000): string {
  if (text.length <= maxChars) return text;
  // Keep first 12k (most relevant) + last 4k (often has summary/conclusion)
  return text.slice(0, 14000) + "\n\n[...middle truncated for brevity...]\n\n" + text.slice(-4000);
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
          send({ type: "agent", agent: "Document Agent", status: "running", message: "Synthesizing research document…" });
          await sleep(2000);
          const mockDoc = getMockResearchDoc(productName);
          const previewContent = mockDoc.sections[0]?.content ?? "";
          send({ type: "preview", text: previewContent.split("\n\n").slice(0, 2).join("\n\n") });
          await sleep(1500);
          send({ type: "agent", agent: "Document Agent", status: "done", message: "12 sections generated" });
          send({ type: "done", document: mockDoc });
          return;
        }

        // ── Agent 1: Question Agent (haiku — fast validation) ─────────────────
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

        // ── Agent 2: Crawler Agent — targeted, reliable-source research ───────
        send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Running targeted product research…" });
        send({ type: "sources", crawled: 0, total: 10 });

        const additionalSearchTerms = buildTargetedSearchTerms(productName, tier1, tier2);

        const crawlerPrompt = `You are a product research analyst. Research "${productName}" using web search. Execute the following searches in order and extract precise, structured data from each.

MANDATORY SEARCHES (run each separately):

1. "${productName}" official pricing plans features 2024 2025
   → Extract: exact plan names, prices per seat/month, feature breakdown, free tier limits, enterprise pricing

2. "${productName}" revenue ARR growth funding valuation crunchbase pitchbook
   → Extract: total funding raised, latest round amount/date/lead investor, valuation, ARR estimate, revenue growth %

3. "${productName}" G2 Capterra Trustpilot reviews rating
   → Extract: overall rating (X/5 from N reviews), top 5 pros, top 5 cons, most common complaints, NPS if available

4. "${productName}" competitors vs alternatives comparison 2024
   → Extract: top 3-5 competitors, differentiation, price comparison, win/loss reasons, market positioning

5. "${productName}" customers case studies enterprise users growth metrics
   → Extract: notable customers, customer count (if public), ACV, churn signals, expansion revenue

6. "${productName}" market size TAM SAM SOM industry forecast 2024 2025 2026
   → Extract: total addressable market ($), market growth rate (CAGR %), market segments

7. "${productName}" founders team employees LinkedIn Glassdoor culture
   → Extract: founder names/backgrounds, employee count, Glassdoor rating, key hires, org structure

8. "${productName}" technical architecture stack infrastructure integrations API
   → Extract: tech stack, cloud provider, programming languages, key integrations, API capabilities

9. "${productName}" reddit hackernews community discussion sentiment 2024
   → Extract: community size, top praised features, top complaints, power user quotes, feature requests

10. "${productName}" news announcements product updates roadmap 2024 2025
    → Extract: recent launches, product milestones, strategic announcements, roadmap signals

${additionalSearchTerms ? `ADDITIONAL SEARCHES (based on user focus areas):\n${additionalSearchTerms}\n` : ""}
${userContext ? `USER-PROVIDED CONTEXT (treat as primary signal — cross-reference with web data):\n${userContext}\n` : ""}

RELIABLE SOURCE PRIORITY (weight data accordingly):
- Tier 1 (highest): Official site, SEC filings, Crunchbase, PitchBook, official press releases
- Tier 2: TechCrunch, Forbes, Bloomberg, WSJ, Reuters, business news
- Tier 3: G2, Capterra, Trustpilot, App Store (aggregated reviews)
- Tier 4: Reddit, HackerNews, Twitter/X, community forums

OUTPUT FORMAT — Return a dense structured report (NOT prose):

## PRICING & PLANS
[Exact tier names | prices | key limits | target buyer]

## FINANCIALS & FUNDING
[Round history | total raised | valuation | ARR estimate | revenue growth]

## USER REVIEWS & SENTIMENT
[Rating | review count | top pros | top cons | NPS | key complaints]

## COMPETITIVE LANDSCAPE
[Competitor | Positioning vs ${productName} | Price | Key Differentiator | Win Scenario]

## CUSTOMERS & ICP
[Customer segments | notable logos | ACV | customer count | use cases]

## MARKET & INDUSTRY
[Market size ($) | CAGR (%) | key segments | forecast]

## TEAM & COMPANY
[Founders | employee count | key executives | culture signals]

## TECHNICAL STACK
[Languages | cloud | databases | key integrations | API]

## COMMUNITY & ECOSYSTEM
[Community size | sentiment | top topics | partner ecosystem]

## RECENT NEWS & ROADMAP
[Key announcements | product updates | strategic signals | dates]

## ALL SOURCES
[List every URL where data was found with a 1-line description of what was extracted]

Be specific — use exact numbers, dates, percentages, direct quotes. Mark uncertain estimates as "est."`;

        const crawlerResult = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 6000,
          tools: {
            webSearch: anthropic.tools.webSearch_20250305({ maxUses: 10 }),
          },
          messages: [{ role: "user", content: crawlerPrompt }],
        });

        if (crawlerResult.usage) {
          await trackTokens(sessionId, productName, "crawler_agent", crawlerResult.usage.inputTokens, crawlerResult.usage.outputTokens);
        }

        const researchText = crawlerResult.text;
        const urls = extractURLs(researchText);

        urls.forEach((url, i) => {
          try {
            const domain = new URL(url).hostname.replace("www.", "");
            const findings = extractFindingsForDomain(domain, researchText);
            send({ type: "crawl", url: domain, message: `Fetched ${domain}`, findings });
            send({ type: "sources", crawled: i + 1, total: Math.max(urls.length, 10) });
          } catch {}
        });

        send({ type: "agent", agent: "Crawler Agent", status: "done", message: `Pulled data from ${urls.length || "multiple"} sources` });

        // ── Agent 3: Document Agent — detailed 12-section report ──────────────
        send({ type: "agent", agent: "Document Agent", status: "running", message: "Synthesizing deep-dive report…" });

        const tier2Context = Object.entries(tier2)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join("\n");

        const compressedResearch = compressCrawlerText(researchText);

        const docPrompt = `You are a senior product analyst writing a comprehensive teardown of "${productName}" for investors, founders, and product teams.

RESEARCH DATA:
${compressedResearch}

USER PROFILE:
- Focus areas: ${focusAreas}
- Goal: ${tier1.goal ?? "general analysis"}
- Depth: ${tier1.depth ?? "standard"}
- In-depth preferences: ${tier2Context || "none"}
${userContext ? `- User context: ${userContext}` : ""}

Generate a 12-section research document as valid JSON only (no markdown, no backticks).

CRITICAL:
- Every section must have substantial content (3-5 paragraphs minimum)
- Use REAL data from the research — specific numbers, percentages, dates, names
- chartData and tables must have realistic numeric values (not placeholders)
- bullets array = 4-6 sharp, specific takeaways per section
- stats array = 3-6 key metrics with real numbers
- tables = structured comparison data for PPT slides
- chartData = numeric data suitable for bar/pie/line charts in presentations

JSON SCHEMA (return exactly this structure with all 12 sections):

{
  "sections": [
    {
      "id": "exec_summary",
      "title": "Executive Summary",
      "content": "3-4 paragraph strategic overview of ${productName} — what it is, why it matters, key thesis, current position in market. Each paragraph 80-120 words. Separate with \\n\\n.",
      "keyInsight": "single most important strategic insight",
      "stats": [
        {"label": "Founded", "value": "YEAR", "sub": "company age"},
        {"label": "Valuation", "value": "$XB", "sub": "latest round", "change": "+X% YoY"},
        {"label": "Customers", "value": "X,000+", "sub": "paying accounts"},
        {"label": "Employees", "value": "~X,000", "sub": "LinkedIn estimate"}
      ],
      "bullets": ["key takeaway 1", "key takeaway 2", "key takeaway 3", "key takeaway 4", "key takeaway 5"]
    },
    {
      "id": "product_ux",
      "title": "Product & UX Analysis",
      "content": "3-4 paragraphs on product philosophy, core user flows, onboarding experience, UX strengths and weaknesses, recent product changes. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important product/UX insight",
      "stats": [
        {"label": "G2 Rating", "value": "X.X/5", "sub": "X,XXX reviews"},
        {"label": "App Store", "value": "X.X/5", "sub": "if applicable"},
        {"label": "Top Complaint", "value": "short description", "sub": "from reviews"}
      ],
      "bullets": ["UX insight 1", "UX insight 2", "UX insight 3", "UX insight 4"],
      "tables": [
        {
          "id": "feature_matrix",
          "title": "Core Feature Matrix",
          "headers": ["Feature", "Free Tier", "Pro Tier", "Enterprise"],
          "rows": [
            ["Feature 1", "Limited", "Full", "Custom"],
            ["Feature 2", "No", "Yes", "Yes"],
            ["Feature 3", "Basic", "Advanced", "Unlimited"]
          ]
        }
      ]
    },
    {
      "id": "business_model",
      "title": "Business Model & Revenue",
      "content": "3-4 paragraphs on revenue model, monetization strategy, unit economics signals, expansion revenue, gross margin indicators. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important revenue insight",
      "stats": [
        {"label": "ARR Estimate", "value": "$XM", "sub": "est. YEAR", "change": "+X% YoY"},
        {"label": "Revenue Model", "value": "SaaS / Usage / Hybrid"},
        {"label": "Gross Margin", "value": "~XX%", "sub": "estimated"},
        {"label": "Primary Metric", "value": "value", "sub": "description"}
      ],
      "bullets": ["business model insight 1", "insight 2", "insight 3", "insight 4"],
      "chartData": [
        {
          "id": "revenue_segments",
          "type": "pie",
          "title": "Revenue by Segment",
          "data": [
            {"label": "Enterprise", "value": 55},
            {"label": "Mid-Market", "value": 30},
            {"label": "SMB", "value": 15}
          ]
        }
      ]
    },
    {
      "id": "pricing_analysis",
      "title": "Pricing Deep-Dive",
      "content": "3-4 paragraphs analyzing pricing strategy, tier structure, value-based vs cost-based pricing, price anchoring, competitive price positioning, freemium conversion signals. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important pricing insight",
      "stats": [
        {"label": "Free Tier", "value": "Yes / No / Trial"},
        {"label": "Entry Price", "value": "$X/mo per seat"},
        {"label": "Enterprise", "value": "Custom / $X+"},
        {"label": "Price vs Competitors", "value": "Premium / Parity / Discount"}
      ],
      "bullets": ["pricing insight 1", "insight 2", "insight 3", "insight 4"],
      "tables": [
        {
          "id": "pricing_tiers",
          "title": "Pricing Tier Breakdown",
          "headers": ["Plan", "Price", "Users", "Storage / Limits", "Key Features", "Target"],
          "rows": [
            ["Free", "$0", "1-X", "X GB", "Basic features", "Individual"],
            ["Pro", "$X/mo", "Up to X", "X GB", "Advanced features", "Small teams"],
            ["Business", "$X/mo", "Unlimited", "Unlimited", "All features + admin", "Growing companies"],
            ["Enterprise", "Custom", "Unlimited", "Unlimited", "SSO, SLA, compliance", "Large orgs"]
          ]
        }
      ],
      "chartData": [
        {
          "id": "pricing_comparison",
          "type": "bar",
          "title": "Price Comparison vs Competitors (Pro tier, $/seat/mo)",
          "xAxis": "Product",
          "yAxis": "Price ($/seat/mo)",
          "unit": "$",
          "data": [
            {"label": "${productName}", "value": 0},
            {"label": "Competitor A", "value": 0},
            {"label": "Competitor B", "value": 0},
            {"label": "Competitor C", "value": 0}
          ]
        }
      ]
    },
    {
      "id": "gtm_growth",
      "title": "GTM & Growth Strategy",
      "content": "3-4 paragraphs on go-to-market motion, primary growth channels, sales-led vs product-led signals, geographic expansion, partnership strategy, recent growth catalysts. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important GTM insight",
      "stats": [
        {"label": "GTM Motion", "value": "PLG / SLG / Hybrid"},
        {"label": "Est. Monthly Traffic", "value": "X.XM visits", "sub": "SimilarWeb est."},
        {"label": "Primary Channel", "value": "description"},
        {"label": "CAC Estimate", "value": "$X,XXX", "sub": "if available"}
      ],
      "bullets": ["GTM insight 1", "insight 2", "insight 3", "insight 4"],
      "chartData": [
        {
          "id": "growth_trajectory",
          "type": "line",
          "title": "Estimated Customer Growth",
          "xAxis": "Year",
          "yAxis": "Customers",
          "data": [
            {"label": "2020", "value": 0},
            {"label": "2021", "value": 0},
            {"label": "2022", "value": 0},
            {"label": "2023", "value": 0},
            {"label": "2024", "value": 0}
          ]
        }
      ]
    },
    {
      "id": "tech_arch",
      "title": "Technical Architecture",
      "content": "3-4 paragraphs covering tech stack, infrastructure choices, scalability approach, API capabilities, key technical differentiators, technical debt signals, engineering culture. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important technical insight",
      "stats": [
        {"label": "Cloud Provider", "value": "AWS / GCP / Azure / Multi"},
        {"label": "Primary Language", "value": "language"},
        {"label": "API Available", "value": "Yes / No / REST / GraphQL"},
        {"label": "Integrations", "value": "X+ native integrations"}
      ],
      "bullets": ["tech insight 1", "insight 2", "insight 3", "insight 4"],
      "tables": [
        {
          "id": "tech_stack",
          "title": "Technology Stack",
          "headers": ["Layer", "Technology", "Notes"],
          "rows": [
            ["Frontend", "tech", "detail"],
            ["Backend", "tech", "detail"],
            ["Database", "tech", "detail"],
            ["Infrastructure", "tech", "detail"],
            ["AI/ML", "tech or N/A", "detail"]
          ]
        }
      ]
    },
    {
      "id": "market_comp",
      "title": "Market & Competitive Landscape",
      "content": "3-4 paragraphs on market positioning, competitive moats, head-to-head comparisons with top 3 competitors, where the product wins vs loses, switching costs. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important competitive insight",
      "stats": [
        {"label": "TAM", "value": "$XB", "sub": "total addressable market"},
        {"label": "Market CAGR", "value": "XX%", "sub": "growth rate"},
        {"label": "Market Position", "value": "Leader / Challenger / Niche"},
        {"label": "Top Competitor", "value": "competitor name"}
      ],
      "bullets": ["competitive insight 1", "insight 2", "insight 3", "insight 4"],
      "tables": [
        {
          "id": "competitive_matrix",
          "title": "Competitive Comparison Matrix",
          "headers": ["Dimension", "${productName}", "Competitor A", "Competitor B", "Competitor C"],
          "rows": [
            ["Price (entry)", "$X/mo", "$X/mo", "$X/mo", "$X/mo"],
            ["Free tier", "Yes/No", "Yes/No", "Yes/No", "Yes/No"],
            ["Key strength", "value", "value", "value", "value"],
            ["Primary weakness", "value", "value", "value", "value"],
            ["Best for", "segment", "segment", "segment", "segment"]
          ]
        }
      ],
      "chartData": [
        {
          "id": "market_share",
          "type": "pie",
          "title": "Estimated Market Share by Player",
          "data": [
            {"label": "${productName}", "value": 0},
            {"label": "Competitor A", "value": 0},
            {"label": "Competitor B", "value": 0},
            {"label": "Others", "value": 0}
          ]
        }
      ]
    },
    {
      "id": "customer_profiles",
      "title": "Customer Profiles & ICP",
      "content": "3-4 paragraphs describing ideal customer profile, primary buyer personas, key use cases, customer segments, notable logos, what triggers purchase decision. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important ICP insight",
      "stats": [
        {"label": "Primary Segment", "value": "Enterprise / SMB / Consumer"},
        {"label": "Typical Buyer", "value": "job title / department"},
        {"label": "Avg Contract Size", "value": "$X,XXX ACV", "sub": "est."},
        {"label": "Key Use Case", "value": "primary use case"}
      ],
      "bullets": ["ICP insight 1", "insight 2", "insight 3", "insight 4"],
      "tables": [
        {
          "id": "customer_segments",
          "title": "Customer Segment Breakdown",
          "headers": ["Segment", "Size", "Key Needs", "Notable Logos", "Revenue %"],
          "rows": [
            ["Enterprise", "1000+ employees", "Security, compliance, SSO", "examples", "~X%"],
            ["Mid-Market", "100-999", "Scalability, integrations", "examples", "~X%"],
            ["SMB", "<100", "Ease of use, price", "examples", "~X%"]
          ]
        }
      ],
      "chartData": [
        {
          "id": "customer_mix",
          "type": "donut",
          "title": "Customer Mix by Segment",
          "data": [
            {"label": "Enterprise", "value": 0},
            {"label": "Mid-Market", "value": 0},
            {"label": "SMB / Self-serve", "value": 0}
          ]
        }
      ]
    },
    {
      "id": "community",
      "title": "Community & Ecosystem",
      "content": "3-4 paragraphs on community size and health, integration ecosystem, partner program, developer adoption, content/education moat, network effects. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important community insight",
      "stats": [
        {"label": "Community Size", "value": "X,000+ members"},
        {"label": "GitHub Stars", "value": "X,000+ (if applicable)"},
        {"label": "Integrations", "value": "X+ apps"},
        {"label": "Reddit Activity", "value": "X,000+ subscribers"}
      ],
      "bullets": ["community insight 1", "insight 2", "insight 3", "insight 4"]
    },
    {
      "id": "financials",
      "title": "Financials & Funding",
      "content": "3-4 paragraphs on funding history, investor quality, burn rate signals, path to profitability, recent financial events, secondary market signals. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important financial insight",
      "stats": [
        {"label": "Total Raised", "value": "$XM / $XB"},
        {"label": "Last Round", "value": "Series X — $XM (YEAR)"},
        {"label": "Lead Investor", "value": "investor name"},
        {"label": "Valuation", "value": "$XB (YEAR)"},
        {"label": "Est. Runway", "value": "X years (est.)"}
      ],
      "bullets": ["financial insight 1", "insight 2", "insight 3", "insight 4"],
      "tables": [
        {
          "id": "funding_rounds",
          "title": "Funding Round History",
          "headers": ["Round", "Year", "Amount", "Lead Investor", "Valuation", "Key Milestone"],
          "rows": [
            ["Seed", "YEAR", "$XM", "investor", "$XM", "milestone"],
            ["Series A", "YEAR", "$XM", "investor", "$XM", "milestone"],
            ["Series B", "YEAR", "$XM", "investor", "$XB", "milestone"]
          ]
        }
      ],
      "chartData": [
        {
          "id": "funding_growth",
          "type": "bar",
          "title": "Funding Raised by Round ($M)",
          "xAxis": "Round",
          "yAxis": "Amount ($M)",
          "unit": "$M",
          "data": [
            {"label": "Seed", "value": 0},
            {"label": "Series A", "value": 0},
            {"label": "Series B", "value": 0},
            {"label": "Series C", "value": 0}
          ]
        }
      ]
    },
    {
      "id": "swot_analysis",
      "title": "SWOT Analysis",
      "content": "4 paragraphs — one each for Strengths, Weaknesses, Opportunities, Threats. Be specific and data-backed. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "single most important strategic takeaway from SWOT",
      "bullets": [
        "STRENGTH: specific strength with evidence",
        "STRENGTH: specific strength with evidence",
        "WEAKNESS: specific weakness with evidence",
        "WEAKNESS: specific weakness with evidence",
        "OPPORTUNITY: specific opportunity with market signal",
        "THREAT: specific threat with competitor or market evidence"
      ],
      "tables": [
        {
          "id": "swot_table",
          "title": "SWOT Summary",
          "headers": ["Category", "Factor", "Evidence / Signal"],
          "rows": [
            ["Strength", "S1", "evidence"],
            ["Strength", "S2", "evidence"],
            ["Weakness", "W1", "evidence"],
            ["Weakness", "W2", "evidence"],
            ["Opportunity", "O1", "market signal"],
            ["Opportunity", "O2", "market signal"],
            ["Threat", "T1", "competitive signal"],
            ["Threat", "T2", "market risk"]
          ]
        }
      ]
    },
    {
      "id": "strategic_outlook",
      "title": "Strategic Outlook & Risks",
      "content": "3-4 paragraphs on 12-18 month outlook, biggest strategic bets, key risks (technology, competitive, regulatory, execution), acqui-hire potential, IPO signals, final verdict. 80-120 words each. Separate with \\n\\n.",
      "keyInsight": "final verdict: bull/bear case in one sentence",
      "stats": [
        {"label": "Outlook", "value": "Bullish / Cautious / Bearish"},
        {"label": "Biggest Risk", "value": "short description"},
        {"label": "Biggest Opportunity", "value": "short description"},
        {"label": "Acquisition Target?", "value": "Likely / Possible / Unlikely"}
      ],
      "bullets": ["strategic insight 1", "insight 2", "insight 3", "insight 4", "insight 5"]
    }
  ],
  "sources": [
    {"num": 1, "domain": "example.com", "title": "Page title — key data extracted", "url": "https://example.com", "usedIn": "Section Name"},
    {"num": 2, "domain": "crunchbase.com", "title": "Funding data", "url": "https://crunchbase.com/...", "usedIn": "Financials"}
  ]
}

IMPORTANT: Replace ALL placeholder values (YEAR, $XM, X,000, etc.) with REAL data from the research. If a data point is unavailable, use a reasonable labeled estimate ("~$X est." or "n/a — private company"). Every chart's data array must contain real numeric values. The competitive matrix and pricing tables must have real competitor names and prices from the research.`;

        const docResult = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          maxOutputTokens: 16000,
          messages: [{ role: "user", content: docPrompt }],
        });

        if (docResult.usage) {
          await trackTokens(sessionId, productName, "document_agent", docResult.usage.inputTokens, docResult.usage.outputTokens);
        }

        const docData = extractJSON<ResearchDoc>(docResult.text);

        const execSection = docData.sections?.find((s) => s.id === "exec_summary");
        if (execSection?.content) {
          send({ type: "preview", text: execSection.content.split("\n\n").slice(0, 2).join("\n\n") });
        }

        send({ type: "agent", agent: "Document Agent", status: "done", message: `${docData.sections?.length ?? 12} sections generated` });
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
