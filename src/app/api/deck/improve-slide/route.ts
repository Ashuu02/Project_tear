import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { getQuestionModel, resolveModelName, type ModelProvider } from "@/lib/providers";
import { extractJSON } from "@/lib/extractJSON";
import { trackTokens } from "@/lib/tokenTracker";
import type { CanvasSlide } from "@/types/teardown";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Scoped, low-risk by design: only rewrites the *text* of existing text elements (tighter,
// punchier copy) — positions, sizes, fonts, colors, charts, and every other element type
// pass through untouched. Reusing the cheap/fast tier per provider (haiku/flash/llama) for
// low-latency single-slide iteration, same as Question/Crawler agents elsewhere in the app.
export async function POST(req: NextRequest) {
  const { productName, slide, model, sessionId } = await req.json() as {
    productName: string;
    slide: CanvasSlide;
    model?: ModelProvider;
    sessionId?: string;
  };

  const textEls = slide.elements.filter((el): el is Extract<CanvasSlide["elements"][number], { type: "text" }> => el.type === "text");
  if (textEls.length === 0) return NextResponse.json({ slide });

  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ slide });
  }

  const items = textEls.map((el) => ({ id: el.id, text: el.text }));
  const resolvedModel = model ?? "claude";

  const improveStartTime = Date.now();
  const { text: raw, usage } = await generateText({
    model: getQuestionModel(resolvedModel),
    maxOutputTokens: 800,
    messages: [{
      role: "user",
      content: `You are tightening copy on one slide of a "${productName}" product-teardown deck. Improve each text snippet below — punchier, clearer, same approximate length, keep any numbers/facts exactly as given. Don't add new claims.\n\nSnippets:\n${JSON.stringify(items)}\n\nReturn ONLY valid JSON, one entry per input id, same order:\n{"improvements":[{"id":"...","text":"..."}]}`,
    }],
  });

  if (sessionId && usage) {
    await trackTokens(sessionId, productName, "slide_improve", resolveModelName(resolvedModel, "question"), usage.inputTokens, usage.outputTokens, { durationMs: Date.now() - improveStartTime });
  }

  let improvements: { id: string; text: string }[] = [];
  try {
    improvements = extractJSON<{ improvements: { id: string; text: string }[] }>(raw).improvements ?? [];
  } catch {
    return NextResponse.json({ slide }); // malformed response — return the slide unchanged rather than fail the request
  }

  const textById = new Map(improvements.map((i) => [i.id, i.text]));
  const updatedSlide: CanvasSlide = {
    ...slide,
    elements: slide.elements.map((el) =>
      el.type === "text" && textById.has(el.id) ? { ...el, text: textById.get(el.id)! } : el
    ),
  };

  return NextResponse.json({ slide: updatedSlide });
}
