"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import DeckEditorCanvas from "@/components/deck-editor/DeckEditorCanvas";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";
import type { CanvasSlide } from "@/types/teardown";

const EMPTY_SELECTION = new Set<string>();
function noop() {}

interface OffscreenSlideCaptureProps {
  slide: CanvasSlide | null;
  onCaptured: (dataUrl: string) => void;
}

// Renders one slide off-screen at full resolution and reports its PNG once painted — used
// by PDF export to capture every slide in the deck, not just the one currently on screen.
// A fixed settle delay (rather than tracking every image element's load event) is a
// deliberate scope call: correct for the common case, could miss a slow-loading image on
// a slide with many of them.
const SETTLE_MS = 500;

export default function OffscreenSlideCapture({ slide, onCaptured }: OffscreenSlideCaptureProps) {
  const stageRef = useRef<Konva.Stage | null>(null);

  useEffect(() => {
    if (!slide) return;
    const t = setTimeout(() => {
      const stage = stageRef.current;
      onCaptured(stage ? stage.toDataURL({ pixelRatio: 1, mimeType: "image/png" }) : "");
    }, SETTLE_MS);
    return () => clearTimeout(t);
  }, [slide, onCaptured]);

  if (!slide) return null;

  return (
    <div style={{ position: "fixed", left: -99999, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, pointerEvents: "none" }} aria-hidden>
      <DeckEditorCanvas
        slide={slide} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} scale={1}
        selectedIds={EMPTY_SELECTION}
        onSelect={noop} onMarqueeSelect={noop} onDeselectAll={noop} onChangeElement={noop} onLiveDrag={noop}
        onStageMount={(s) => { stageRef.current = s; }}
      />
    </div>
  );
}
