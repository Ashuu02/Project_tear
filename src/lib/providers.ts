import { anthropic } from "@/lib/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

export type ModelProvider = "claude" | "gemini" | "groq";

export const MODEL_META: Record<ModelProvider, { label: string; sub: string; badge: string }> = {
  claude: { label: "Claude",        sub: "Anthropic · Best quality",   badge: "Default"   },
  gemini: { label: "Gemini Flash",  sub: "Google · Free tier",          badge: "Free"      },
  groq:   { label: "Groq / Llama",  sub: "Meta LLaMA 3.3 · Free & fast",badge: "Free"      },
};

const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
});

export const googleTools = googleAI.tools;

const groqAI = createGroq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export function getQuestionModel(provider: ModelProvider) {
  switch (provider) {
    case "gemini": return googleAI("gemini-2.0-flash");
    case "groq":   return groqAI("llama-3.3-70b-versatile");
    default:       return anthropic("claude-haiku-4-5-20251001");
  }
}

export function getCrawlerModel(provider: ModelProvider) {
  switch (provider) {
    case "gemini": return googleAI("gemini-2.0-flash");
    case "groq":   return groqAI("llama-3.3-70b-versatile");
    default:       return anthropic("claude-haiku-4-5-20251001");
  }
}

export function getDocumentModel(provider: ModelProvider) {
  switch (provider) {
    case "gemini": return googleAI("gemini-2.0-flash");
    case "groq":   return groqAI("llama-3.3-70b-versatile");
    default:       return anthropic("claude-sonnet-4-6");
  }
}
