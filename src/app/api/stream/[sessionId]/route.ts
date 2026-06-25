import { NextRequest } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@/lib/anthropic";
import type { ResearchDoc, DeckData, DeckSlide } from "@/types/teardown";

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
  return Array.from(new Set(matches)).slice(0, 6);
}

export async function GET(
  req: NextRequest
) {
  const { searchParams } = req.nextUrl;
  const productName = searchParams.get("product") ?? "Unknown Product";
  const tier1Raw = searchParams.get("tier1") ?? "{}";
  let tier1: { dimensions?: string[]; goal?: string; depth?: string } = {};
  try { tier1 = JSON.parse(tier1Raw); } catch {}

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      try {
        // ── Agent 1: Question Agent ───────────────────────────────────────────
        send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…` });

        const { text: questionText } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 300,
          messages: [{
            role: "user",
            content: `Confirm that "${productName}" is a real software product. Return exactly 2 sentences: one confirming it exists and its category, one describing its core value proposition.`,
          }],
        });

        send({ type: "agent", agent: "Question Agent", status: "done", message: questionText.split(".")[0].trim() });

        // ── Agent 2: Crawler Agent ────────────────────────────────────────────
        send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Searching the web…" });
        send({ type: "sources", crawled: 0, total: 5 });

        const { text: researchText } = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          maxOutputTokens: 5000,
          tools: {
            webSearch: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
          },
          messages: [{
            role: "user",
            content: `Research ${productName} comprehensively using web search.\n\nFind and synthesize:\n1. Product overview, core features, and recent updates\n2. Pricing tiers and business model details\n3. User reviews and sentiment from G2, Reddit, App Store — include specific ratings and numbers\n4. Funding history and company background\n5. Key competitors and market position\n6. Technical architecture (if publicly known)\n7. Community size, ecosystem, and engagement metrics\n\nProvide a detailed research summary with specific numbers, dates, and the URLs where you found information.`,
          }],
        });

        const urls = extractURLs(researchText);
        urls.forEach((url, i) => {
          try {
            const domain = new URL(url).hostname.replace("www.", "");
            send({ type: "crawl", url: domain, message: `Fetched ${domain}` });
            send({ type: "sources", crawled: i + 1, total: Math.max(urls.length, 5) });
          } catch {}
        });

        send({ type: "agent", agent: "Crawler Agent", status: "done", message: `Pulled data from ${urls.length || "multiple"} sources` });

        // ── Agent 3: Document Agent ───────────────────────────────────────────
        send({ type: "agent", agent: "Document Agent", status: "running", message: "Synthesizing research document…" });

        const focusAreas = (tier1.dimensions ?? []).join(", ") || "all areas";
        const { text: docText } = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          maxOutputTokens: 8000,
          messages: [{
            role: "user",
            content: `You are a product analyst. Based on this research about ${productName}:\n\n${researchText}\n\nUser focus areas: ${focusAreas}. Goal: ${tier1.goal ?? "general"}. Depth: ${tier1.depth ?? "standard"}.\n\nGenerate a comprehensive product teardown document. Return ONLY valid JSON — no markdown, no backticks, no extra text:\n\n{"sections":[{"id":"exec_summary","title":"Executive Summary","paragraphs":["paragraph 1","paragraph 2","paragraph 3"],"keyInsight":"one key strategic insight","stats":[{"label":"Users","value":"30M+","sub":"registered accounts"}]},{"id":"product_ux","title":"Product & UX","paragraphs":["p1","p2"],"keyInsight":"insight","table":{"label":"Core Features","headers":["Feature","Description"],"rows":[["Feature name","What it does"]]}},{"id":"business_model","title":"Business Model & Revenue","paragraphs":["p1","p2"],"keyInsight":"insight","table":{"label":"Pricing Tiers","headers":["Tier","Price","Target","Key unlock"],"rows":[["Free","$0","Individuals","Basic access"]]},"stats":[{"label":"Est. ARR","value":"$X","sub":"estimate"}]},{"id":"gtm_growth","title":"GTM & Growth","paragraphs":["p1","p2"],"keyInsight":"insight","table":{"label":"Growth Channels","headers":["Channel","How it works"],"rows":[["Channel name","description"]]}},{"id":"tech_arch","title":"Technical Architecture","paragraphs":["p1","p2"],"keyInsight":"insight","table":{"label":"Tech Stack","headers":["Layer","Technology"],"rows":[["Frontend","React/TypeScript"]]}},{"id":"market_comp","title":"Market & Competition","paragraphs":["p1","p2"],"keyInsight":"insight","table":{"label":"Competitive Landscape","headers":["Competitor","Angle","Threat Level"],"rows":[["Company","their angle","High"]]}},{"id":"community","title":"Community & Ecosystem","paragraphs":["p1","p2"],"keyInsight":"insight","stats":[{"label":"Metric","value":"Value","sub":"context"}]},{"id":"financials","title":"Financials & Funding","paragraphs":["p1","p2"],"keyInsight":"insight","table":{"label":"Funding History","headers":["Round","Year","Amount","Lead Investor"],"rows":[["Series A","2020","$10M","VC Name"]]},"stats":[{"label":"Total Raised","value":"$X"}]}],"sources":[{"num":1,"domain":"example.com","title":"Page title","url":"https://example.com","usedIn":"Executive Summary"}]}\n\nInclude ALL 8 sections. Be specific with real data about ${productName}. Each section: 2-3 paragraphs.`,
          }],
        });

        const docData = extractJSON<ResearchDoc>(docText);

        const execSection = docData.sections?.find(s => s.id === "exec_summary");
        if (execSection?.paragraphs?.length) {
          send({ type: "preview", text: execSection.paragraphs.slice(0, 2).join("\n\n") });
        }

        send({ type: "agent", agent: "Document Agent", status: "done", message: `${docData.sections?.length ?? 8} sections generated` });

        // ── Agent 4: PPTX Agent ───────────────────────────────────────────────
        send({ type: "agent", agent: "PPTX Agent", status: "running", message: "Building slide deck…" });

        const summaryForDeck = (docData.sections ?? []).map(s => ({
          id: s.id,
          title: s.title,
          summary: s.paragraphs?.[0]?.slice(0, 200),
          keyInsight: s.keyInsight,
          stats: s.stats,
        }));

        const { text: deckText } = await generateText({
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 4000,
          messages: [{
            role: "user",
            content: `Based on this product teardown for ${productName}, create a 10-slide presentation deck.\n\nResearch:\n${JSON.stringify(summaryForDeck)}\n\nReturn ONLY valid JSON — no markdown, no backticks:\n{"slides":[{"type":"cover","title":"${productName}","subtitle":"AI-Powered Product Teardown"},{"type":"bullets","sectionNum":"01","title":"Executive Summary","bullets":[{"text":"Key point","sub":"supporting detail"},{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"}],"stats":[{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"}]},{"type":"features","sectionNum":"02","title":"Product & UX","items":[{"name":"Feature 1","desc":"description"},{"name":"Feature 2","desc":"description"},{"name":"Feature 3","desc":"description"}]},{"type":"pricing","sectionNum":"03","title":"Business Model & Revenue","tiers":[{"name":"Tier","price":"$X","target":"Segment","highlight":false}],"revenueStats":[{"label":"ARR","value":"$X"},{"label":"Paid Users","value":"XM"},{"label":"Enterprise %","value":"X%"}]},{"type":"gtm","sectionNum":"04","title":"GTM & Growth","phases":[{"label":"Phase 1","desc":"description","metric":"X%"},{"label":"Phase 2","desc":"description","metric":"metric"},{"label":"Phase 3","desc":"description","metric":"metric"}]},{"type":"techstack","sectionNum":"05","title":"Technical Architecture","layers":[{"layer":"Frontend","detail":"technology"},{"layer":"Backend","detail":"technology"},{"layer":"Database","detail":"technology"},{"layer":"Real-time","detail":"technology"},{"layer":"AI","detail":"technology"}]},{"type":"competitive","sectionNum":"06","title":"Market & Competition","tam":"$XB+","cagr":"X%","competitors":[{"name":"Competitor","angle":"angle","threat":"High"},{"name":"Competitor","angle":"angle","threat":"Medium"},{"name":"Competitor","angle":"angle","threat":"Low"},{"name":"Competitor","angle":"angle","threat":"Low"},{"name":"Competitor","angle":"angle","threat":"Low"}]},{"type":"stats","sectionNum":"07","title":"Community & Ecosystem","stats":[{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"}],"insight":"key insight"},{"type":"funding","sectionNum":"08","title":"Financials & Funding","rounds":[{"round":"Seed","year":"YYYY","amount":"$XM","lead":"VC"},{"round":"Series A","year":"YYYY","amount":"$XM","lead":"VC"}],"totalRaised":"$XM","valuation":"$XB","arr":"$XM+"},{"type":"sources","title":"Sources & Appendix","sources":["[1] Source title — domain.com","[2] Source title — domain.com","[3] Source title — domain.com"]}]}\n\nFill in real data from the research. Keep slides concise.`,
          }],
        });

        const deckData = extractJSON<DeckData>(deckText);
        if (deckData.slides?.[0]) {
          (deckData.slides[0] as DeckSlide).title = productName;
        }

        send({ type: "agent", agent: "PPTX Agent", status: "done", message: `${deckData.slides?.length ?? 10} slides ready` });
        send({ type: "done", document: docData, deck: deckData });

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
