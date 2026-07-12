import { generateText } from "ai";
import type { LanguageModelUsage } from "ai";
import { getDeckModel, resolveModelName, type ModelProvider } from "@/lib/providers";
import { extractJSON } from "@/lib/extractJSON";
import type { DeckData, DeckSlide } from "@/types/teardown";

// Same character-escaping approach the Document Agent's route already uses for its own
// JSON recovery — kept local here since the recovery closing shape below is specific to
// the deck's {"slides":[...]}\ structure, not something a shared helper can generalize.
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

// If the model's output got cut off mid-array (hit maxOutputTokens, or just produced a
// stray trailing comma), salvage every *complete* slide rather than failing the whole
// generation — a deck with fewer slides than requested beats a 500.
function recoverTruncatedDeckJSON(json: string): DeckData {
  let depth = 0, inString = false, escape = false;
  let lastSlideEnd = -1;
  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      // top object (depth 0->1) -> "slides" array (depth 1->2) -> slide object (depth 2->3,
      // back to 2 on close). depth === 2 here means we just closed one complete slide.
      if (c === "}" && depth === 2) lastSlideEnd = i;
    }
  }
  if (lastSlideEnd <= 0) throw new Error("JSON recovery failed — no complete slides found in model output");
  const recovered = sanitizeJSONString(json.slice(0, lastSlideEnd + 1)) + "]}";
  return JSON.parse(recovered) as DeckData;
}

function extractDeckJSON(text: string): DeckData {
  try {
    return extractJSON<DeckData>(text);
  } catch {
    const start = text.indexOf("{");
    if (start === -1) throw new Error("No JSON found in model response");
    return recoverTruncatedDeckJSON(text.slice(start));
  }
}

export interface DeckConfig {
  slideCount?: number;
  theme?: string;
  focus?: string[];
  tone?: string;
  charts?: boolean;
}

export interface DeckSectionSummary {
  id: string;
  title: string;
  summary?: string;
  keyInsight?: string;
  stats?: Array<{ label: string; value: string }>;
}

export async function generateDeckData(
  productName: string,
  sections: DeckSectionSummary[],
  config: DeckConfig | undefined,
  model: ModelProvider,
): Promise<{ deckData: DeckData; usage: LanguageModelUsage | undefined; modelName: string }> {
  const slideCount = config?.slideCount ?? 10;
  const tone       = config?.tone ?? "investor";
  const focus      = config?.focus?.join(", ") ?? "mixed";
  const theme      = config?.theme ?? "warm";
  const charts     = config?.charts !== false;

  // 4000 was a flat budget regardless of slideCount — fine for 5 slides, too tight for 15-20,
  // which was truncating mid-JSON and throwing a hard parse error on every larger deck.
  const maxOutputTokens = Math.min(8000, 2000 + slideCount * 400);

  const { text: deckText, usage } = await generateText({
    model: getDeckModel(model),
    maxOutputTokens,
    messages: [{
      role: "user",
      content: `Create a ${slideCount}-slide presentation deck for ${productName}.\nAudience tone: ${tone}. Content focus: ${focus}. Theme: ${theme}. ${charts ? "Include references to charts where relevant." : "Do not reference charts."}\n\nResearch summary:\n${JSON.stringify(sections)}\n\nReturn ONLY valid JSON — no markdown, no backticks:\n{"slides":[{"type":"cover","title":"${productName}","subtitle":"AI-Powered Product Teardown"},{"type":"bullets","sectionNum":"01","title":"Executive Summary","bullets":[{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"},{"text":"Key point","sub":"detail"}],"stats":[{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"}]},{"type":"features","sectionNum":"02","title":"Product & UX","items":[{"name":"Feature 1","desc":"description"},{"name":"Feature 2","desc":"description"},{"name":"Feature 3","desc":"description"}]},{"type":"pricing","sectionNum":"03","title":"Business Model & Revenue","tiers":[{"name":"Tier","price":"$X","target":"Segment","highlight":false}],"revenueStats":[{"label":"ARR","value":"$X"},{"label":"Paid Users","value":"XM"},{"label":"Enterprise %","value":"X%"}]},{"type":"gtm","sectionNum":"04","title":"GTM & Growth","phases":[{"label":"Phase 1","desc":"description","metric":"X%"},{"label":"Phase 2","desc":"description","metric":"metric"},{"label":"Phase 3","desc":"description","metric":"metric"}]},{"type":"techstack","sectionNum":"05","title":"Technical Architecture","layers":[{"layer":"Frontend","detail":"technology"},{"layer":"Backend","detail":"technology"},{"layer":"Database","detail":"technology"},{"layer":"Real-time","detail":"technology"},{"layer":"AI","detail":"technology"}]},{"type":"competitive","sectionNum":"06","title":"Market & Competition","tam":"$XB+","cagr":"X%","competitors":[{"name":"Competitor","angle":"angle","threat":"High"},{"name":"Competitor","angle":"angle","threat":"Medium"},{"name":"Competitor","angle":"angle","threat":"Low"}]},{"type":"stats","sectionNum":"07","title":"Community & Ecosystem","stats":[{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"},{"label":"Metric","value":"Value"}],"insight":"key insight"},{"type":"funding","sectionNum":"08","title":"Financials & Funding","rounds":[{"round":"Seed","year":"YYYY","amount":"$XM","lead":"VC"},{"round":"Series A","year":"YYYY","amount":"$XM","lead":"VC"}],"totalRaised":"$XM","valuation":"$XB","arr":"$XM+"},{"type":"sources","title":"Sources & Appendix","sources":["[1] Source — domain.com","[2] Source — domain.com","[3] Source — domain.com"]}]}\n\nFill in real data from the research. Keep slides concise.`,
    }],
  });

  const deckData = extractDeckJSON(deckText);
  if (deckData.slides?.[0]) {
    (deckData.slides[0] as DeckSlide).title = productName;
  }

  return { deckData, usage, modelName: resolveModelName(model, "deck") };
}
