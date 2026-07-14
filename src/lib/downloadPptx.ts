import type { DeckData, CanvasSlide } from "@/types/teardown";

async function downloadFromResponse(res: Response, productName: string) {
  if (!res.ok) throw new Error("PPTX generation failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-teardown.pptx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPptx(productName: string, deckData: DeckData, sessionId?: string) {
  const res = await fetch("/api/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, deckData, sessionId }),
  });
  await downloadFromResponse(res, productName);
}

export async function downloadPptxFromCanvas(productName: string, canvasSlides: CanvasSlide[], sessionId?: string) {
  const res = await fetch("/api/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, canvasSlides, sessionId }),
  });
  await downloadFromResponse(res, productName);
}
