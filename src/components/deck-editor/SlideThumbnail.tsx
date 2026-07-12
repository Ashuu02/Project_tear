"use client";

import DeckEditorCanvas from "@/components/deck-editor/DeckEditorCanvas";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";
import type { CanvasSlide } from "@/types/teardown";

const THUMB_WIDTH = 96;
const THUMB_SCALE = THUMB_WIDTH / SLIDE_WIDTH;
const THUMB_HEIGHT = SLIDE_HEIGHT * THUMB_SCALE;

const EMPTY_SELECTION = new Set<string>();
function noop() {}

// A small, non-interactive live render of a slide — reuses the real Konva renderer so
// thumbnails can never drift from what the slide actually looks like, at the cost of one
// extra (cheap, static) Konva Stage per slide versus a cached toDataURL() snapshot.
export default function SlideThumbnail({ slide }: { slide: CanvasSlide }) {
  return (
    <div style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }} className="pointer-events-none overflow-hidden rounded">
      <DeckEditorCanvas
        slide={slide}
        width={SLIDE_WIDTH}
        height={SLIDE_HEIGHT}
        scale={THUMB_SCALE}
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
