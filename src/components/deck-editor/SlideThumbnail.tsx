"use client";

import DeckEditorCanvas from "@/components/deck-editor/DeckEditorCanvas";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";
import type { CanvasSlide } from "@/types/teardown";

const THUMB_WIDTH = 96;
const THUMB_HEIGHT = SLIDE_HEIGHT * (THUMB_WIDTH / SLIDE_WIDTH);

const EMPTY_SELECTION = new Set<string>();
function noop() {}

interface SlideThumbnailProps {
  slide: CanvasSlide;
  /** Rendered width in px — height is derived from the slide's fixed 16:9 aspect ratio. Defaults
   *  to THUMB_WIDTH for existing callers; pass an explicit width to fill a differently-sized slot
   *  (e.g. a rail thumbnail whose available width isn't the filmstrip's 96px). */
  width?: number;
}

// A small, non-interactive live render of a slide — reuses the real Konva renderer so
// thumbnails can never drift from what the slide actually looks like, at the cost of one
// extra (cheap, static) Konva Stage per slide versus a cached toDataURL() snapshot.
export default function SlideThumbnail({ slide, width = THUMB_WIDTH }: SlideThumbnailProps) {
  const scale = width / SLIDE_WIDTH;
  const height = SLIDE_HEIGHT * scale;
  return (
    <div style={{ width, height }} className="pointer-events-none overflow-hidden rounded">
      <DeckEditorCanvas
        slide={slide}
        width={SLIDE_WIDTH}
        height={SLIDE_HEIGHT}
        scale={scale}
        selectedIds={EMPTY_SELECTION}
        onSelect={noop}
        onMarqueeSelect={noop}
        onDeselectAll={noop}
        onChangeElement={noop}
        onLiveDrag={noop}
      />
    </div>
  );
}

export { THUMB_WIDTH, THUMB_HEIGHT };
