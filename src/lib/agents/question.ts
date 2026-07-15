import { generateText } from "ai";
import { getQuestionModel, resolveModelName, type ModelProvider } from "@/lib/providers";
import { trackTokens } from "@/lib/tokenTracker";

export interface QuestionAgentResult {
  summary: string;
}

export async function runQuestionAgent(
  productName: string,
  modelParam: ModelProvider,
  sessionId: string,
): Promise<QuestionAgentResult> {
  const startTime = Date.now();

  const result = await generateText({
    model: getQuestionModel(modelParam),
    maxOutputTokens: 60,
    messages: [{ role: "user", content: `In one sentence: what is "${productName}" and its core value prop?` }],
  });

  if (result.usage) {
    await trackTokens(
      sessionId, productName, "question_agent",
      resolveModelName(modelParam, "question"),
      result.usage.inputTokens, result.usage.outputTokens,
      { durationMs: Date.now() - startTime },
    );
  }

  return { summary: result.text.split(".")[0].trim() };
}
