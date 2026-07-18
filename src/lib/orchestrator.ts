import { generateText, tool, stepCountIs } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import type { ModelProvider } from "@/lib/providers";
import type { ResearchDoc } from "@/types/teardown";
import { runQuestionAgent } from "./agents/question";
import { runCrawlerAgent } from "./agents/crawler";
import { runDocumentAgent, CHARS_PER_SEC } from "./agents/document";
import type { DepthConfig, SendFn } from "./agents/types";

const groqAI = createGroq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export interface OrchestratorInput {
  productName: string;
  sessionId: string;
  tier1: { dimensions?: string[]; goal?: string; depth?: string };
  tier2Context: string;
  userContext: string;
  modelParam: ModelProvider;
  depthConfig: DepthConfig;
  sectionsNeeded: string[];
  send: SendFn;
}

export interface OrchestratorResult {
  researchText: string;
  crawlCount: number;
  freshDocData: ResearchDoc;
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { productName, sessionId, tier1, tier2Context, userContext, modelParam, depthConfig, sectionsNeeded, send } = input;

  let researchText = "";
  let crawlCount = 0;
  let freshDocData: ResearchDoc | null = null;

  const tools = {
    validate_product: tool({
      description: "Validate the product and get its one-line value proposition. Always call this first.",
      inputSchema: z.object({
        productName: z.string().describe("The exact product name to validate"),
      }),
      execute: async ({ productName: name }: { productName: string }) => {
        send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${name}…`, progress: 40 });
        const result = await runQuestionAgent(name, modelParam, sessionId);
        send({ type: "agent", agent: "Question Agent", status: "done", message: result.summary });
        return result.summary;
      },
    }),

    search_web: tool({
      description: "Search the web for product data. Generate targeted queries yourself based on the product and focus areas.",
      inputSchema: z.object({
        queries: z.array(z.string()).min(1).max(6)
          .describe("Targeted search queries you generate — cover pricing, funding, reviews, competitors, tech stack, and any focus-area specifics"),
      }),
      execute: async ({ queries }: { queries: string[] }) => {
        const scaledTokens = Math.max(500, Math.round(depthConfig.maxCrawlerTokens * (sectionsNeeded.length / 12)));
        const reusedCount = 12 - sectionsNeeded.length;
        const suffix = reusedCount > 0 ? ` (${reusedCount} sections reused from cache)` : "";
        send({ type: "agent", agent: "Crawler Agent", status: "running", message: `Searching across ${queries.length} sources…${suffix}` });

        const result = await runCrawlerAgent({
          productName,
          queries,
          userContext,
          modelParam,
          maxCrawlerTokens: scaledTokens,
          sessionId,
          send,
        });

        researchText = result.researchText;
        crawlCount = result.crawlCount;
        send({ type: "agent", agent: "Crawler Agent", status: "done", message: `Pulled data from ${result.crawlCount || "multiple"} sources` });
        return `Indexed ${result.crawlCount} sources. ${result.researchText.length} chars of research gathered.`;
      },
    }),

    synthesize_document: tool({
      description: "Synthesize the gathered research into a structured teardown document. Call after search_web.",
      inputSchema: z.object({
        focusNote: z.string().optional()
          .describe("Optional emphasis or framing based on what the research revealed — passed into the document prompt"),
      }),
      execute: async ({ focusNote }: { focusNote?: string }) => {
        if (!researchText) throw new Error("search_web must be called before synthesize_document");

        const estSec = Math.round(depthConfig.estimatedOutChars / CHARS_PER_SEC);
        const etaStr = estSec > 60 ? `~${Math.ceil(estSec / 60)}m` : `~${estSec}s`;
        send({ type: "agent", agent: "Document Agent", status: "running",
          message: `Researching ${sectionsNeeded.length} sections (est. ${etaStr})…`, progress: 0 });

        const result = await runDocumentAgent({
          productName,
          tier1,
          tier2Context,
          userContext: userContext + (focusNote ? ` ${focusNote}` : ""),
          research: researchText,
          modelParam,
          depthConfig,
          sectionsNeeded,
          sessionId,
          send,
        });

        freshDocData = result.docData;
        return `Generated ${result.docData.sections.length} sections.`;
      },
    }),
  };

  const focusSummary = (tier1.dimensions ?? []).join(", ") || "all areas";
  const dimHints = [
    tier1.dimensions?.includes("tech") && "  - Technical architecture, APIs, infrastructure, engineering blog",
    tier1.dimensions?.includes("fin")  && "  - Detailed financials, investor names, round sizes, ARR milestones",
    tier1.dimensions?.includes("gtm")  && "  - Go-to-market strategy, acquisition channels, SEO, paid ads, partnerships",
  ].filter(Boolean).join("\n");

  await generateText({
    model: groqAI("llama-3.3-70b-versatile"),
    maxOutputTokens: 400,
    stopWhen: stepCountIs(5),
    system: `You are the orchestrator for a product teardown research pipeline.

Your role: coordinate three specialist agents to produce a comprehensive teardown of "${productName}".
You do NOT generate content yourself — you call tools in the correct order with the right parameters.

AGENT SEQUENCE (always in this order):
1. validate_product — call first, always
2. search_web — generate ${depthConfig.maxSearches} targeted queries. Cover:
   - "${productName}" pricing plans tiers free trial 2025
   - "${productName}" funding ARR revenue valuation investors
   - "${productName}" reviews competitors alternatives G2 Reddit
   - "${productName}" tech stack engineering team customers 2025
${dimHints ? dimHints : ""}
   Sections to research: ${sectionsNeeded.join(", ")}
3. synthesize_document — call after search_web; add a focusNote summarising what the research revealed

Focus areas: ${focusSummary}
User goal: ${tier1.goal ?? "general teardown"}
Depth: ${tier1.depth ?? "standard"}`,
    messages: [{ role: "user", content: `Run the teardown pipeline for "${productName}".` }],
    tools,
  });

  if (!freshDocData) throw new Error("Orchestrator completed without producing a document");
  return { researchText, crawlCount, freshDocData };
}
