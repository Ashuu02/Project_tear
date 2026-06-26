import { NextRequest } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@/lib/anthropic";
import type { ResearchDoc } from "@/types/teardown";
import { sleep, getMockResearchDoc } from "@/data/mockPipeline";

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
  return Array.from(new Set(matches)).slice(0, 6);
}

export async function GET(req: NextRequest) {
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
        if (DEMO_MODE) {
          // ── Demo mode: stream mock events with realistic delays ──────────────
          send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…` });
          await sleep(1200);
          send({ type: "agent", agent: "Question Agent", status: "done", message: `${productName} confirmed as a software product` });

          send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Searching the web…" });
          send({ type: "sources", crawled: 0, total: 5 });
          await sleep(700);

          const mockDomains = ["notion.so", "techcrunch.com", "g2.com", "reddit.com", "bloomberg.com"];
          for (let i = 0; i < mockDomains.length; i++) {
            await sleep(550);
            send({ type: "crawl", url: mockDomains[i], message: `Fetched ${mockDomains[i]}` });
            send({ type: "sources", crawled: i + 1, total: 5 });
          }

          send({ type: "agent", agent: "Crawler Agent", status: "done", message: "Pulled data from 5 sources" });
          send({ type: "agent", agent: "Document Agent", status: "running", message: "Synthesizing research document…" });
          await sleep(2000);

          const mockDoc = getMockResearchDoc(productName);
          const previewContent = mockDoc.sections[0]?.content ?? "";
          send({ type: "preview", text: previewContent.split("\n\n").slice(0, 2).join("\n\n") });
          await sleep(1500);

          send({ type: "agent", agent: "Document Agent", status: "done", message: "8 sections generated" });
          send({ type: "done", document: mockDoc });
          return;
        }

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
          model: anthropic("claude-haiku-4-5-20251001"),
          maxOutputTokens: 4000,
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
            content: `You are a product analyst. Based on this research about ${productName}:\n\n${researchText}\n\nUser focus: ${focusAreas}. Goal: ${tier1.goal ?? "general"}. Depth: ${tier1.depth ?? "standard"}.\n\nGenerate a product teardown as JSON. Return ONLY valid JSON — no markdown, no backticks, no extra text.\n\nSchema (keep content under 400 chars per section, separate paragraphs with \\n\\n):\n{"sections":[{"id":"exec_summary","title":"Executive Summary","content":"paragraph 1\\n\\nparagraph 2\\n\\nparagraph 3","keyInsight":"one strategic insight","stats":[{"label":"Users","value":"30M+","sub":"registered accounts"}]},{"id":"product_ux","title":"Product & UX","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight about UX"},{"id":"business_model","title":"Business Model & Revenue","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight about revenue","stats":[{"label":"Est. ARR","value":"$X"}]},{"id":"gtm_growth","title":"GTM & Growth","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight about growth"},{"id":"tech_arch","title":"Technical Architecture","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight about tech"},{"id":"market_comp","title":"Market & Competition","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight about competition"},{"id":"community","title":"Community & Ecosystem","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight","stats":[{"label":"Metric","value":"value"}]},{"id":"financials","title":"Financials & Funding","content":"paragraph 1\\n\\nparagraph 2","keyInsight":"one insight","stats":[{"label":"Total Raised","value":"$X"}]}],"sources":[{"num":1,"domain":"example.com","title":"Page title","url":"https://example.com","usedIn":"Executive Summary"}]}\n\nInclude ALL 8 sections. Be specific with real data from the research about ${productName}.`,
          }],
        });

        const docData = extractJSON<ResearchDoc>(docText);

        const execSection = docData.sections?.find(s => s.id === "exec_summary");
        if (execSection?.content) {
          send({ type: "preview", text: execSection.content.split("\n\n").slice(0, 2).join("\n\n") });
        }

        send({ type: "agent", agent: "Document Agent", status: "done", message: `${docData.sections?.length ?? 8} sections generated` });
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
