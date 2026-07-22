import type { DeckData, CanvasSlide } from "@/types/teardown";
import { track } from "@/lib/posthog";

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
  track("pptx_download_initiated", { product_name: productName, session_id: sessionId });
  const res = await fetch("/api/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, deckData, sessionId }),
  });
  await downloadFromResponse(res, productName);
  track("pptx_download_completed", { product_name: productName, session_id: sessionId });
}

export async function downloadPptxFromCanvas(productName: string, canvasSlides: CanvasSlide[], sessionId?: string) {
  track("pptx_download_initiated", { product_name: productName, session_id: sessionId, source: "canvas" });
  const res = await fetch("/api/pptx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, canvasSlides, sessionId }),
  });
  await downloadFromResponse(res, productName);
  track("pptx_download_completed", { product_name: productName, session_id: sessionId, source: "canvas" });
}
