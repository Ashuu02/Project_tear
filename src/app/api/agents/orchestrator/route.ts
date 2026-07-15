import { NextRequest, NextResponse } from "next/server";
import { runOrchestrator } from "@/lib/orchestrator";
import { resolveDepthConfig } from "@/lib/agents/types";
import { normalizeProductKey, getCachedSections } from "@/lib/researchCache";
import type { ModelProvider } from "@/lib/providers";

const CANONICAL_SECTION_IDS = [
  "exec_summary", "product_ux", "business_model", "pricing_analysis", "gtm_growth",
  "tech_arch", "market_comp", "customer_profiles", "community", "financials",
  "swot_analysis", "strategic_outlook",
];

// Standalone POST endpoint — useful for direct testing or future retry flows.
// The main pipeline uses /api/stream/[sessionId] which wraps runOrchestrator with SSE.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      productName?: string;
      sessionId?: string;
      tier1?: { dimensions?: string[]; goal?: string; depth?: string };
      tier2?: Record<string, string | string[]>;
      userContext?: string;
      model?: ModelProvider;
      depth?: string;
    };

    const productName = body.productName ?? "Unknown Product";
    const sessionId   = body.sessionId   ?? "standalone";
    const tier1       = body.tier1       ?? {};
    const tier2       = body.tier2       ?? {};
    const userContext = body.userContext  ?? "";
    const modelParam  = (body.model       ?? "claude") as ModelProvider;
    const depthConfig = resolveDepthConfig(body.depth ?? null);
    const tier2Context = Object.entries(tier2)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join(" | ");

    const productKey  = normalizeProductKey(productName);
    const cachedMap   = await getCachedSections(productKey);
    const sectionsNeeded = CANONICAL_SECTION_IDS.filter((id) => !cachedMap[id]);

    const events: object[] = [];
    const send = (payload: object) => events.push(payload);

    const result = await runOrchestrator({
      productName, sessionId, tier1, tier2Context, userContext,
      modelParam, depthConfig, sectionsNeeded, send,
    });

    return NextResponse.json({
      ok: true,
      sections: result.freshDocData.sections.length,
      crawlCount: result.crawlCount,
      events,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
