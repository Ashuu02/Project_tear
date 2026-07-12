"use client";

import { useState } from "react";
import SlideThumbnail, { THUMB_WIDTH, THUMB_HEIGHT } from "@/components/deck-editor/SlideThumbnail";
import type { CanvasSlide } from "@/types/teardown";

interface SlideNavigatorProps {
  slides: CanvasSlide[];
  currentSlide: number;
  onSelectSlide: (i: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
  onDuplicateSlide: (i: number) => void;
  onDeleteSlide: (i: number) => void;
  onAddSlide: () => void;
}

export default function SlideNavigator({
  slides, currentSlide, onSelectSlide, onReorderSlides, onDuplicateSlide, onDeleteSlide, onAddSlide,
}: SlideNavigatorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 border-t border-black/20 bg-[#221F1D] overflow-x-auto">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
          onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== i) onReorderSlides(dragIndex, i);
            setDragIndex(null); setOverIndex(null);
          }}
          onClick={() => onSelectSlide(i)}
          className={`group relative flex-shrink-0 rounded-md overflow-hidden border-2 cursor-pointer transition-colors ${
            i === currentSlide ? "border-tear-primary" : "border-transparent hover:border-white/30"
          } ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-tear-primary/60" : ""}`}
          style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
        >
          <SlideThumbnail slide={slide} />
          <span className="absolute bottom-0.5 left-1 text-[9px] font-mono text-white/70 bg-black/50 px-1 rounded-sm pointer-events-none">
            {i + 1}
          </span>
          <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicateSlide(i); }}
              title="Duplicate slide"
              className="w-4 h-4 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded-sm text-white/80 text-[10px] leading-none"
            >
              ⧉
            </button>
            {slides.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteSlide(i); }}
                title="Delete slide"
                className="w-4 h-4 flex items-center justify-center bg-black/60 hover:bg-red-500/80 rounded-sm text-white/80 text-[10px] leading-none"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={onAddSlide}
        title="Add blank slide"
        className="flex-shrink-0 flex items-center justify-center rounded-md border-2 border-dashed border-white/15 hover:border-white/40 text-white/40 hover:text-white/70 transition-colors"
        style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
      >
        <span className="text-lg">+</span>
      </button>
    </div>
  );
}
