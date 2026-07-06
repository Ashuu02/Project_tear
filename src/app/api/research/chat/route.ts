import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import type { LanguageModelUsage } from "ai";
import { anthropic } from "@/lib/anthropic";
import { getDocumentModel, googleTools, type ModelProvider } from "@/lib/providers";
import { tavilySearch } from "@/lib/tavily";
import { trackTokens } from "@/lib/tokenTracker";
import type { ResearchDoc } from "@/types/teardown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  sessionId: string;
  productName: string;
  message: string;
  researchDoc: ResearchDoc;
  history: ChatMessage[];
  model?: ModelProvider;
}

function detectReCrawlIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const reCrawlKeywords = [
    "re-research", "re-crawl", "search for", "find more", "look up",
    "look for", "google", "search the web", "find data",
    "find information", "find out",
  ];
  return reCrawlKeywords.some((kw) => lower.includes(kw));
}

function parseSectionUpdate(text: string): { sectionId: string; newContent: string } | null {
  const match = text.match(/<section_update>([\s\S]*?)<\/section_update>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as { sectionId: string; newContent: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { sessionId, productName, message, researchDoc, history, model = "claude" } = body;

    if (!message || !productName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sectionIds = researchDoc?.sections?.map((s) => s.id).join(", ") ?? "";
    const isReCrawl = detectReCrawlIntent(message);

    const systemPrompt = `You are a research assistant helping edit a product teardown document about ${productName}.
The current research document has these sections: ${sectionIds}.

When asked to edit or rewrite a section, output your response then append:
<section_update>{"sectionId": "SECTION_ID", "newContent": "FULL NEW CONTENT"}</section_update>

Keep section content under 600 chars per paragraph. Use \\n\\n between paragraphs.
Be direct and specific. Use the existing research as your primary source.
Only call web search if the user explicitly asks to find new information.
Minimize tokens — be concise.`;

    const chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      ...(history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let resultText: string;
    let usage: LanguageModelUsage | undefined;

    if (isReCrawl) {
      // ── Re-crawl: fetch fresh web data then answer ─────────────────────────
      if (model === "gemini") {
        // Gemini: native Google Search grounding
        const result = await generateText({
          model: getDocumentModel("gemini"),
          maxOutputTokens: 600,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: { google_search: googleTools.googleSearch({}) as any },
          system: systemPrompt,
          messages: chatHistory,
        });
        resultText = result.text;
        usage = result.usage;

      } else if (model === "groq") {
        // Groq: Tavily search then Groq synthesis
        const tavilyResults = await tavilySearch(`${productName} ${message}`, 3);
        const context = tavilyResults
          .map((r) => `SOURCE: ${r.url}\nTITLE: ${r.title}\nSNIPPET: ${r.content}`)
          .join("\n\n---\n\n");

        const augmentedHistory: Array<{ role: "user" | "assistant"; content: string }> = [
          ...chatHistory.slice(0, -1),
          {
            role: "user",
            content: `${message}\n\nFRESH WEB RESEARCH:\n${context || "No additional results found."}`,
          },
        ];
        const result = await generateText({
          model: getDocumentModel("groq"),
          maxOutputTokens: 600,
          system: systemPrompt,
          messages: augmentedHistory,
        });
        resultText = result.text;
        usage = result.usage;

      } else {
        // Claude: native web search tool
        const result = await generateText({
          model: anthropic("claude-sonnet-4-6"),
          maxOutputTokens: 600,
          tools: { webSearch: anthropic.tools.webSearch_20250305({ maxUses: 3 }) },
          system: systemPrompt,
          messages: chatHistory,
        });
        resultText = result.text;
        usage = result.usage;
      }

    } else {
      // ── Regular chat/rewrite: use selected model directly ─────────────────
      const result = await generateText({
        model: getDocumentModel(model),
        maxOutputTokens: 500,
        system: systemPrompt,
        messages: chatHistory,
      });
      resultText = result.text;
      usage = result.usage;
    }

    if (usage) {
      await trackTokens(sessionId, productName, "chatbot", usage.inputTokens, usage.outputTokens);
    }

    const sectionUpdate = parseSectionUpdate(resultText);

    return NextResponse.json({
      reply: resultText,
      sectionUpdate: sectionUpdate ?? undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
