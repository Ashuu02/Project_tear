"use client";

import { useState } from "react";
import SlideThumbnail, { THUMB_WIDTH } from "@/components/deck-editor/SlideThumbnail";
import type { CanvasSlide } from "@/types/teardown";

// Matches the 142px rail's available thumbnail width: 142 - (14px*2 padding) - 16px number
// column - 9px gap = 89px. The number/gap/padding values are the rail's own fixed layout, so
// this is derived once here rather than duplicated as a second magic number.
const RAIL_THUMB_WIDTH = 89;

interface SlideNavigatorProps {
  slides: CanvasSlide[];
  currentSlide: number;
  onSelectSlide: (i: number) => void;
  onReorderSlides: (fromIndex: number, toIndex: number) => void;
  onDuplicateSlide: (i: number) => void;
  onDeleteSlide: (i: number) => void;
  onAddSlide: () => void;
  /** "vertical" (default) is the 142px left rail at >=1024px. "horizontal" is the <1024px
   *  scrolling strip below the stage — same drag-reorder/duplicate/delete behavior, just laid
   *  out in a row instead of a column, and without the "SLIDES" header (no room for it). */
  orientation?: "vertical" | "horizontal";
}

export default function SlideNavigator({
  slides, currentSlide, onSelectSlide, onReorderSlides, onDuplicateSlide, onDeleteSlide, onAddSlide,
  orientation = "vertical",
}: SlideNavigatorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (orientation === "horizontal") {
    return (
      <div className="w-full flex-shrink-0 bg-tear-bg border-t border-tear-border flex items-center gap-2.5 px-4 py-3 overflow-x-auto">
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
              i === currentSlide ? "border-tear-primary" : "border-transparent hover:border-tear-border"
            } ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-tear-primary/60" : ""}`}
            style={{ width: THUMB_WIDTH }}
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
          className="flex-shrink-0 aspect-video rounded-md border-2 border-dashed border-tear-chip-border hover:border-tear-primary text-tear-chip hover:text-tear-primary transition-colors flex items-center justify-center"
          style={{ width: THUMB_WIDTH }}
        >
          <span className="text-lg">+</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-[142px] flex-shrink-0 bg-tear-bg border-r border-tear-border flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-[13px] pb-[11px] border-b border-tear-border flex-shrink-0">
        <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">Slides</span>
        <span className="font-mono text-[11px] text-[#A89890]">{slides.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-[7px]">
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
            className="group flex items-start gap-[9px] cursor-pointer p-[3px] rounded-[7px] transition-colors hover:bg-[#F0E8DF]"
          >
            <span className={`font-mono text-[10.5px] w-4 flex-shrink-0 text-right pt-[13px] ${i === currentSlide ? "text-tear-primary font-medium" : "text-[#A89890]"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>

            <div
              className={`relative flex-1 aspect-video rounded-[5px] bg-[#F5EFE4] border overflow-hidden transition-colors ${
                i === currentSlide
                  ? "border-tear-primary shadow-[0_0_0_2px_rgba(194,69,30,0.13)]"
                  : "border-tear-border group-hover:border-tear-primary"
              } ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-tear-primary/60" : ""}`}
            >
              <SlideThumbnail slide={slide} width={RAIL_THUMB_WIDTH} />
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
          </div>
        ))}

        <button
          onClick={onAddSlide}
          title="Add blank slide"
          className="ml-[25px] aspect-video rounded-[5px] border border-dashed border-[#D8C3B2] bg-transparent flex items-center justify-center transition-colors hover:border-tear-primary hover:bg-[#FBF4EE]"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <line x1="8" y1="3" x2="8" y2="13" stroke="#B0A49E" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="3" y1="8" x2="13" y2="8" stroke="#B0A49E" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
