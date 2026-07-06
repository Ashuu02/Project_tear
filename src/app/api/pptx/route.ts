import { NextRequest, NextResponse } from "next/server";
import type { DeckData } from "@/types/teardown";
import { buildPptxBuffer } from "@/lib/buildPptx";
import { uploadPptxFile } from "@/lib/adminTeardowns";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function POST(req: NextRequest) {
  const { productName, deckData, sessionId } = (await req.json()) as {
    productName: string;
    deckData: DeckData;
    sessionId?: string;
  };

  const buffer = await buildPptxBuffer(productName, deckData);
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
