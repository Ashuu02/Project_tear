import { NextRequest, NextResponse } from "next/server";
import type { DeckData, CanvasSlide } from "@/types/teardown";
import { buildPptxBuffer, buildPptxBufferFromCanvas } from "@/lib/buildPptx";
import { uploadPptxFile } from "@/lib/adminTeardowns";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function POST(req: NextRequest) {
  const { productName, deckData, canvasSlides, sessionId } = (await req.json()) as {
    productName: string;
    deckData?: DeckData;
    canvasSlides?: CanvasSlide[];
    sessionId?: string;
  };

  // The editor (Task 6+) sends canvasSlides; the older read-only viewer still sends the
  // flat deckData — both are supported so that fallback view keeps working unmodified.
  const buffer = canvasSlides
    ? await buildPptxBufferFromCanvas(productName, canvasSlides)
    : await buildPptxBuffer(productName, deckData!);
  const slug = productName.replace(/\s+/g, "-").toLowerCase();

  if (sessionId && !DEMO_MODE) {
    await uploadPptxFile(sessionId, productName, buffer);
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${slug}-teardown.pptx"`,
    },
  });
}
