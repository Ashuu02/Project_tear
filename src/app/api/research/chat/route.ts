import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import type { LanguageModelUsage } from "ai";
import { anthropic } from "@/lib/anthropic";
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
}

function detectReCrawlIntent(message: string): boolean {
  const lower = message.toLowerCase();
  const reCrawlKeywords = [
    "re-research",
    "re-crawl",
    "search for",
    "find more",
    "look up",
    "look for",
    "google",
    "search the web",
    "find data",
    "find information",
    "find out",
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
    const { sessionId, productName, message, researchDoc, history } = body;

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

    // Build message history for the model
    const chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      ...(history ?? []).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let resultText: string;
    let usage: LanguageModelUsage | undefined;

    if (isReCrawl) {
      // Re-crawl mode: use claude-sonnet-4-6 with web search
      const result = await generateText({
        model: anthropic("claude-sonnet-4-6"),
        maxOutputTokens: 1500,
        tools: {
          webSearch: anthropic.tools.webSearch_20250305({ maxUses: 3 }),
        },
        system: systemPrompt,
        messages: chatHistory,
      });
      resultText = result.text;
      usage = result.usage;
    } else {
      // Rewrite mode: use claude-haiku-4-5-20251001 (no web search, faster & cheaper)
      const result = await generateText({
        model: anthropic("claude-haiku-4-5-20251001"),
        maxOutputTokens: 1200,
        system: systemPrompt,
        messages: chatHistory,
      });
      resultText = result.text;
      usage = result.usage;
    }

    // Track tokens
    if (usage) {
      await trackTokens(
        sessionId,
        productName,
        "chatbot",
        usage.inputTokens,
        usage.outputTokens
      );
    }

    // Parse section update
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
