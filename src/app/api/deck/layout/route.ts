import { NextRequest, NextResponse } from "next/server";
import { generateDeckData, type DeckConfig, type DeckSectionSummary } from "@/lib/generateDeckData";
import { deckDataToCanvasSlides } from "@/lib/deckSlideToCanvasSlide";
import { getThemeByKey } from "@/lib/deckThemes";
import { trackTokens } from "@/lib/tokenTracker";
import type { ModelProvider } from "@/lib/providers";
import { getMockDeckData } from "@/data/mockPipeline";
import type { ResearchDoc } from "@/types/teardown";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// "Magic Design" — one-shot AI auto-layout for the whole deck. Deliberately does NOT ask
// the model to emit CanvasSlide[] positions/pixels directly: LLMs are unreliable at precise
// spatial reasoning, and a malformed layout is a much worse failure than a malformed bullet
// list. Instead it reuses the same proven DeckData generation the manual "Generate my deck"
// flow already uses (content + structure decisions, where LLMs are strong), then runs the
// result through the same deterministic converter the rest of the editor relies on for
// pixel-perfect positioning, chart auto-generation, and theme colors.
export async function POST(req: NextRequest) {
  const { productName, researchDoc, config, model, themeKey, sessionId } = await req.json() as {
    productName: string;
    researchDoc: ResearchDoc;
    config?: DeckConfig;
    model?: ModelProvider;
    themeKey?: string;
    sessionId?: string;
  };

  const theme = getThemeByKey(themeKey);

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 1500));
    const mock = getMockDeckData(productName);
    return NextResponse.json({ canvasSlides: deckDataToCanvasSlides(mock.slides, theme) });
  }

  const sections: DeckSectionSummary[] = (researchDoc?.sections ?? []).map((s) => ({
    id: s.id, title: s.title, summary: s.content?.slice(0, 300), keyInsight: s.keyInsight, stats: s.stats,
  }));

  const magicDesignStartTime = Date.now();
  const { deckData, usage, modelName } = await generateDeckData(productName, sections, config, model ?? "claude");
  const canvasSlides = deckDataToCanvasSlides(deckData.slides, theme);

  if (sessionId && usage) {
    await trackTokens(sessionId, productName, "magic_design", modelName, usage.inputTokens, usage.outputTokens, { durationMs: Date.now() - magicDesignStartTime });
  }

  return NextResponse.json({ canvasSlides });
}
