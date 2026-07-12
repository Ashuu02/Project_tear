import { generateText } from "ai";
import type { LanguageModelUsage } from "ai";
import { getQuestionModel, type ModelProvider } from "@/lib/providers";
import { extractJSON } from "@/lib/extractJSON";
import type { ResearchDoc } from "@/types/teardown";

export interface HallucinationCheckResult {
  bySection: Record<string, { confidence: "high" | "medium" | "low"; flags: string[] }>;
  usage: LanguageModelUsage | undefined;
}

const RESEARCH_EXCERPT_CHARS = 2500;

// Compact per-section summary — stats/claims only, not full prose — keeps this check cheap
// (a few hundred output tokens) since it only needs enough signal to judge support, not the
// full document.
function summarizeForCheck(doc: ResearchDoc): string {
  return JSON.stringify(
    doc.sections.map((s) => ({
      id: s.id,
      claim: s.content?.slice(0, 200),
      stats: s.stats?.map((st) => `${st.label}: ${st.value}`),
    }))
  );
}

// One cheap call on the same tier as Question/Crawler agents, run after the Document Agent
// finishes, to sanity-check the generated stats/claims against the raw research that produced
// them. Fail-open: any error here means the document ships without confidence badges rather
// than failing the whole generation — this is a nice-to-have signal, not a gate.
export async function runHallucinationCheck(
  docData: ResearchDoc,
  rawResearchText: string,
  provider: ModelProvider
): Promise<HallucinationCheckResult | null> {
  try {
    const excerpt = rawResearchText.length > RESEARCH_EXCERPT_CHARS
      ? rawResearchText.slice(0, RESEARCH_EXCERPT_CHARS)
      : rawResearchText;

    const { text, usage } = await generateText({
      model: getQuestionModel(provider),
      maxOutputTokens: 600,
      messages: [{
        role: "user",
        content: `Fact-check these generated claims against the raw research they were built from. For each section, rate confidence (how well the research supports its stats/claim) as "high", "medium", or "low", and list up to 2 short exact-text snippets from the claim that look unsupported or fabricated (empty array if none).

RAW RESEARCH (ground truth):
${excerpt}

GENERATED SECTIONS:
${summarizeForCheck(docData)}

Return ONLY valid JSON, no markdown:
{"sections":[{"id":"...","confidence":"high","flags":[]}]}`,
      }],
    });

    const parsed = extractJSON<{ sections: Array<{ id: string; confidence: "high" | "medium" | "low"; flags?: string[] }> }>(text);
    const bySection: HallucinationCheckResult["bySection"] = {};
    for (const s of parsed.sections ?? []) {
      if (!s.id) continue;
      bySection[s.id] = { confidence: s.confidence ?? "medium", flags: s.flags ?? [] };
    }
    return { bySection, usage };
  } catch (err) {
    console.error("[hallucinationCheck] Failed, shipping document without confidence scores:", err);
    return null;
  }
}
