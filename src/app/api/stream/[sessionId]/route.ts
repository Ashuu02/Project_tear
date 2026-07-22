import { NextRequest } from "next/server";
import type { ResearchDoc, ResearchSection, TeardownSource } from "@/types/teardown";
import { sleep, getMockResearchDoc } from "@/data/mockPipeline";
import { trackCacheReuse } from "@/lib/tokenTracker";
import { recordTeardownStart, recordTeardownComplete, recordTeardownError } from "@/lib/adminTeardowns";
import { getProductCategory } from "@/lib/productCategory";
import { runHallucinationCheck } from "@/lib/hallucinationCheck";
import { normalizeProductKey, getCachedSections, saveCachedSections, bumpReuseCount, resolveSourcesBySection, type CachedSectionEntry } from "@/lib/researchCache";
import { runOrchestrator } from "@/lib/orchestrator";
import { resolveDepthConfig } from "@/lib/agents/types";
import type { ModelProvider } from "@/lib/providers";
import { getPostHogServerClient } from "@/lib/posthog-server";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Matches the fixed section order in the document agent's JSON schema — used both to compute
// which sections still need fresh research (cache miss) and to keep merged cached+fresh
// output in a stable, predictable order.
const CANONICAL_SECTION_IDS = [
  "exec_summary", "product_ux", "business_model", "pricing_analysis", "gtm_growth",
  "tech_arch", "market_comp", "customer_profiles", "community", "financials",
  "swot_analysis", "strategic_outlook",
];

// The model is instructed to only list sources it actually cited, but LLMs still occasionally
// list one it forgot to attach to any section's sourceNums, or cite a number that doesn't
// exist in its own sources list. Deterministic cleanup — no extra LLM call — so every source
// shown in CitationsPanel is genuinely clickable/traceable from the document body, and every
// section's sourceNums only points at real sources.
function reconcileSourceCoverage(doc: ResearchDoc): ResearchDoc {
  const validNums = new Set((doc.sources ?? []).map((s) => s.num));
  const sections = (doc.sections ?? []).map((s) => ({
    ...s,
    sourceNums: (s.sourceNums ?? []).filter((n) => validNums.has(n)),
  }));

  const cited = new Set(sections.flatMap((s) => s.sourceNums ?? []));
  const uncovered = (doc.sources ?? []).filter((src) => !cited.has(src.num));

  for (const src of uncovered) {
    const usedInLower = (src.usedIn ?? "").toLowerCase();
    const match = sections.find((s) => usedInLower && (usedInLower.includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(usedInLower)));
    const target = match ?? sections[0];
    if (target) target.sourceNums = Array.from(new Set([...(target.sourceNums ?? []), src.num]));
  }

  return { ...doc, sections };
}

// Splices cached sections (each carrying its own historical sources) into a freshly-generated
// document. Source numbers from the cache entry's original generation don't mean anything in
// this document's numbering — reused sources get appended (de-duplicated by URL) and every
// reused section's sourceNums gets rewritten to point at the new numbers.
function mergeCachedSections(freshDoc: ResearchDoc, cachedEntries: CachedSectionEntry[]): ResearchDoc {
  const freshIds = new Set(freshDoc.sections.map((s) => s.id));
  const toMerge = cachedEntries.filter((c) => !freshIds.has(c.section.id));

  const mergedSources: TeardownSource[] = [...freshDoc.sources];
  const urlToNum = new Map(mergedSources.map((s) => [s.url, s.num]));
  let nextNum = mergedSources.reduce((max, s) => Math.max(max, s.num), 0) + 1;

  const mergedSections: ResearchSection[] = [...freshDoc.sections];
  for (const { section, sources } of toMerge) {
    const oldToNewNum = new Map<number, number>();
    for (const src of sources) {
      let newNum = urlToNum.get(src.url);
      if (newNum === undefined) {
        newNum = nextNum++;
        urlToNum.set(src.url, newNum);
        mergedSources.push({ ...src, num: newNum });
      }
      oldToNewNum.set(src.num, newNum);
    }
    mergedSections.push({
      ...section,
      sourceNums: (section.sourceNums ?? []).map((n) => oldToNewNum.get(n)).filter((n): n is number => n !== undefined),
    });
  }

  const order = new Map(CANONICAL_SECTION_IDS.map((id, i) => [id, i]));
  mergedSections.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));

  return { sections: mergedSections, sources: mergedSources };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const productName = searchParams.get("product") ?? "Unknown Product";
  const sessionId   = searchParams.get("sessionId") ?? "unknown";
  const tier1Raw    = searchParams.get("tier1") ?? "{}";
  const tier2Raw    = searchParams.get("tier2") ?? "{}";
  const userContext = searchParams.get("userContext") ?? "";
  const modelParam  = (searchParams.get("model") ?? "claude") as ModelProvider;
  const depthConfig = resolveDepthConfig(searchParams.get("depth"));

  let tier1: { dimensions?: string[]; goal?: string; depth?: string } = {};
  let tier2: Record<string, string | string[]> = {};
  try { tier1 = JSON.parse(tier1Raw); } catch {}
  try { tier2 = JSON.parse(tier2Raw); } catch {}

  const tier2Context = Object.entries(tier2)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join(" | ");

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }

      if (!DEMO_MODE) {
        await recordTeardownStart(sessionId, productName, getProductCategory(productName), modelParam, tier1, tier2);
      }

      try {
        // ── DEMO MODE ──────────────────────────────────────────────────────
        if (DEMO_MODE) {
          send({ type: "agent", agent: "Question Agent", status: "running", message: `Validating ${productName}…`, progress: 40 });
          await sleep(1200);
          send({ type: "agent", agent: "Question Agent", status: "done", message: `${productName} confirmed as a software product` });
          send({ type: "agent", agent: "Crawler Agent", status: "running", message: "Searching the web…", progress: 0 });
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

        // ── Cache lookup ───────────────────────────────────────────────────
        // Keyed by normalized product name — see researchCache.ts for refresh-score logic.
        const productKey     = normalizeProductKey(productName);
        const category       = getProductCategory(productName);
        const cachedMap      = await getCachedSections(productKey);
        const reusedIds      = CANONICAL_SECTION_IDS.filter((id) =>  cachedMap[id]);
        const sectionsNeeded = CANONICAL_SECTION_IDS.filter((id) => !cachedMap[id]);

        // Zero-cost ledger rows — one per reused section
        await trackCacheReuse(sessionId, productName, "document_agent", reusedIds);

        let freshDocData: ResearchDoc | null = null;
        let researchText = "";
        let crawlCount = 0;

        if (sectionsNeeded.length === 0) {
          // Full cache hit — skip orchestrator entirely
          send({ type: "agent", agent: "Question Agent", status: "done", message: `${productName} — all sections cached` });
          send({ type: "agent", agent: "Crawler Agent",  status: "done", message: `Reused ${reusedIds.length} cached sections — no new crawling needed` });
          send({ type: "agent", agent: "Document Agent", status: "done", message: "All sections served from cache", progress: 100 });

        } else {
          // ── Orchestrator ─────────────────────────────────────────────────
          // LLaMA 3.3 70B on Groq plans + sequences the three agents, generating
          // targeted search queries from the user's focus areas instead of hardcoded ones.
          const result = await runOrchestrator({
            productName,
            sessionId,
            tier1,
            tier2Context,
            userContext,
            modelParam,
            depthConfig,
            sectionsNeeded,
            send,
          });

          freshDocData  = result.freshDocData;
          researchText  = result.researchText;
          crawlCount    = result.crawlCount;

          // Cheap fact-check pass on freshly generated sections only — fail-open so a missing
          // confidence badge never blocks the document from shipping.
          const hallucinationStartTime = Date.now();
          const hallucinationResult = await runHallucinationCheck(freshDocData, researchText, modelParam);
          if (hallucinationResult) {
            for (const section of freshDocData.sections) {
              const check = hallucinationResult.bySection[section.id];
              if (check) {
                section.confidence = check.confidence;
                section.flags      = check.flags;
              }
            }
          }
          void hallucinationStartTime; // used implicitly via Date.now() above

          freshDocData = reconcileSourceCoverage(freshDocData);
        }

        // ── Merge fresh + cached sections ──────────────────────────────────
        const cachedEntries = reusedIds.map((id) => cachedMap[id]);
        const docData = mergeCachedSections(freshDocData ?? { sections: [], sources: [] }, cachedEntries);

        const execSection = docData.sections.find((s) => s.id === "exec_summary");
        if (execSection?.content) {
          send({ type: "preview", text: execSection.content.split("\n\n").slice(0, 2).join("\n\n") });
        }

        const summaryMsg = reusedIds.length > 0
          ? `${docData.sections.length} sections (${sectionsNeeded.length} researched, ${reusedIds.length} reused from cache)`
          : `${docData.sections.length} sections generated`;
        send({ type: "agent", agent: "Document Agent", status: "done", message: summaryMsg, progress: 100 });
        send({ type: "done", document: docData });

        if (!DEMO_MODE) {
          await recordTeardownComplete(sessionId, docData, crawlCount);

          const phServer = getPostHogServerClient();
          phServer.capture({
            distinctId: sessionId,
            event: 'teardown_pipeline_completed',
            properties: {
              product_name: productName,
              session_id: sessionId,
              sections_count: docData.sections.length,
              crawl_count: crawlCount,
              model: modelParam,
              reused_sections: reusedIds.length,
              fresh_sections: sectionsNeeded.length,
            },
          });
          await phServer.shutdown();

          if (freshDocData) {
            await saveCachedSections(productKey, category, freshDocData.sections, resolveSourcesBySection(freshDocData));
          }
          if (reusedIds.length > 0) {
            await bumpReuseCount(productKey, reusedIds);
          }
        }

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
        if (!DEMO_MODE) {
          await recordTeardownError(sessionId, friendly);

          const phServer = getPostHogServerClient();
          phServer.capture({
            distinctId: sessionId,
            event: 'teardown_pipeline_error',
            properties: {
              product_name: productName,
              session_id: sessionId,
              model: modelParam,
              error_message: friendly,
            },
          });
          await phServer.shutdown();
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
