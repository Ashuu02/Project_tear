import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { anthropic } from "@/lib/anthropic";
import type { DeckData, DeckSlide } from "@/types/teardown";
import { getMockDeckData } from "@/data/mockPipeline";
import { recordDeckData, uploadPptxFile } from "@/lib/adminTeardowns";
import { buildPptxBuffer } from "@/lib/buildPptx";

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

interface DeckConfig {
  slideCount?: number;
  theme?: string;
  focus?: string[];
  tone?: string;
  charts?: boolean;
}

export async function POST(req: NextRequest) {
  const { productName, sections, config, sessionId } = await req.json() as {
    productName: string;
    sections: Array<{ id: string; title: string; summary?: string; keyInsight?: string; stats?: Array<{ label: string; value: string }> }>;
    config?: DeckConfig;
    sessionId?: string;
  };

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 1800));
    return NextResponse.json(getMockDeckData(productName));
  }

  const slideCount = config?.slideCount ?? 10;
  const tone       = config?.tone ?? "investor";
  const focus      = config?.focus?.join(", ") ?? "mixed";
  const theme      = config?.theme ?? "warm";
  const charts     = config?.charts !== false;

  const { text: deckText } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    maxOutputTokens: 4000,
    messages: [{
      role: "user",
      content: `Create a ${slideCount}-slide presentation deck for ${productName}.\nAudience tone: ${tone}. Content focus: ${focus}. Theme: ${theme}. ${charts ? "Include references to charts where relevant." : "Do not reference charts."}\n\nResearch summary:\n${JSON.stringify(sections)}\n\nReturn ONLY valid JSON — no markdown, no backticks:\n{"slides":[{"type":"cover","title":"${productName}","subtitle":"AI-Powered Product Teardown"},{"type":"bullets","sectionNum":"01","title":"Executive Summary","bullets":[{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"}],"stats":[{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"}]},{"type":"features","sectionNum":"02","title":"Product & UX","items":[{"name":"Feature 1","desc":"description"},{"name":"Feature 2","desc":"description"},{"name":"Feature 3","desc":"description"}]},{"type":"pricing","sectionNum":"03","title":"Business Model & Revenue","tiers":[{"name":"Tier","price":"$X","target":"Segment","highlight":false}],"revenueStats":[{"label":"ARR","value":"$X"},{"label":"Paid Users","value":"XM"},{"label":"Enterprise %","value":"X%"}]},{"type":"gtm","sectionNum":"04","title":"GTM & Growth","phases":[{"label":"Phase 1","desc":"description","metric":"X%"},{"label":"Phase 2","desc":"description","metric":"metric"},{"label":"Phase 3","desc":"description","metric":"metric"}]},{"type":"techstack","sectionNum":"05","title":"Technical Architecture","layers":[{"layer":"Frontend","detail":"technology"},{"layer":"Backend","detail":"technology"},{"layer":"Database","detail":"technology"},{"layer":"Real-time","detail":"technology"},{"layer":"AI","detail":"technology"}]},{"type":"competitive","sectionNum":"06","title":"Market & Competition","tam":"$XB+","cagr":"X%","competitors":[{"name":"Competitor","angle":"angle","threat":"High"},{"name":"Competitor","angle":"angle","threat":"Medium"},{"name":"Competitor","angle":"angle","threat":"Low"}]},{"type":"stats","sectionNum":"07","title":"Community & Ecosystem","stats":[{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"}],"insight":"key insight"},{"type":"funding","sectionNum":"08","title":"Financials & Funding","rounds":[{"round":"Seed","year":"YYYY","amount":"$XM","lead":"VC"},{"round":"Series A","year":"YYYY","amount":"$XM","lead":"VC"}],"totalRaised":"$XM","valuation":"$XB","arr":"$XM+"},{"type":"sources","title":"Sources & Appendix","sources":["[1] Source — domain.com","[2] Source — domain.com","[3] Source — domain.com"]}]}\n\nFill in real data from the research. Keep slides concise.`,
    }],
  });

  const deckData = extractJSON<DeckData>(deckText);
  if (deckData.slides?.[0]) {
    (deckData.slides[0] as DeckSlide).title = productName;
  }

  if (sessionId) {
    await recordDeckData(sessionId, deckData);
    const pptxBuffer = await buildPptxBuffer(productName, deckData);
    await uploadPptxFile(sessionId, productName, pptxBuffer);
  }

  return NextResponse.json(deckData);
}
