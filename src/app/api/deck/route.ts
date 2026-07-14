import { NextRequest, NextResponse } from "next/server";
import { generateDeckData, type DeckConfig, type DeckSectionSummary } from "@/lib/generateDeckData";
import type { ModelProvider } from "@/lib/providers";
import { getMockDeckData } from "@/data/mockPipeline";
import { recordDeckData, uploadPptxFile } from "@/lib/adminTeardowns";
import { buildPptxBuffer } from "@/lib/buildPptx";
import { trackTokens } from "@/lib/tokenTracker";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function POST(req: NextRequest) {
  const { productName, sections, config, sessionId, model } = await req.json() as {
    productName: string;
    sections: DeckSectionSummary[];
    config?: DeckConfig;
    sessionId?: string;
    model?: ModelProvider;
  };

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 1800));
    return NextResponse.json(getMockDeckData(productName));
  }

  const deckStartTime = Date.now();
  const { deckData, usage, modelName } = await generateDeckData(productName, sections, config, model ?? "claude");

  if (sessionId) {
    // recordDeckData only needs deckData; buildPptxBuffer only needs deckData — independent,
    // so run them concurrently instead of stacking their latency on top of the LLM call.
    const [, pptxBuffer] = await Promise.all([
      recordDeckData(sessionId, deckData),
      buildPptxBuffer(productName, deckData),
    ]);
    await uploadPptxFile(sessionId, productName, pptxBuffer);

    if (usage) {
      await trackTokens(sessionId, productName, "deck_agent", modelName, usage.inputTokens, usage.outputTokens, { durationMs: Date.now() - deckStartTime });
    }
  }

  return NextResponse.json(deckData);
}
