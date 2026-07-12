import { NextRequest, NextResponse } from "next/server";
import { recordCanvasData, loadCanvasData } from "@/lib/adminTeardowns";
import type { CanvasSlide } from "@/types/teardown";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const canvasSlides = await loadCanvasData(sessionId);
  return NextResponse.json({ canvasSlides });
}

export async function POST(req: NextRequest) {
  const { sessionId, canvasSlides } = (await req.json()) as { sessionId?: string; canvasSlides?: CanvasSlide[] };
  if (!sessionId || !canvasSlides) return NextResponse.json({ error: "Missing sessionId or canvasSlides" }, { status: 400 });

  const saved = await recordCanvasData(sessionId, canvasSlides);
  return NextResponse.json({ saved });
}
