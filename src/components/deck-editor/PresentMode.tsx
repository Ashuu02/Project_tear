"use client";

import { useEffect, useRef, useState } from "react";
import DeckEditorCanvas from "@/components/deck-editor/DeckEditorCanvas";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";
import { useElementSize } from "@/hooks/useElementSize";
import type { CanvasSlide } from "@/types/teardown";

const EMPTY_SELECTION = new Set<string>();
function noop() {}

const IDLE_FADE_MS = 2000;
const HINT_FADE_MS = 3500;

interface PresentModeProps {
  slides: CanvasSlide[];
  currentSlide: number;
  onNavigate: (index: number) => void;
  onExit: () => void;
}

export default function PresentMode({ slides, currentSlide, onNavigate, onExit }: PresentModeProps) {
  const [viewportRef, viewportSize] = useElementSize<HTMLDivElement>();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slide = slides[currentSlide];
  const total = slides.length;
  const scale = viewportSize.width > 0 && viewportSize.height > 0
    ? Math.min(viewportSize.width / SLIDE_WIDTH, viewportSize.height / SLIDE_HEIGHT)
    : 0;

  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), HINT_FADE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function resetIdleTimer() {
      setControlsVisible(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setControlsVisible(false), IDLE_FADE_MS);
    }
    resetIdleTimer();
    window.addEventListener("mousemove", resetIdleTimer);
    return () => {
      window.removeEventListener("mousemove", resetIdleTimer);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onExit(); return; }
      if (e.key === "ArrowRight") onNavigate(Math.min(total - 1, currentSlide + 1));
      if (e.key === "ArrowLeft") onNavigate(Math.max(0, currentSlide - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentSlide, total, onNavigate, onExit]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#1C1412] flex items-center justify-center">
      <div ref={viewportRef} className="w-full h-full flex items-center justify-center p-8">
        {scale > 0 && (
          <div style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }} className="rounded-lg overflow-hidden shadow-2xl">
            <DeckEditorCanvas
              slide={slide} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} scale={scale}
              selectedIds={EMPTY_SELECTION}
              onSelect={noop} onMarqueeSelect={noop} onDeselectAll={noop}
              onChangeElement={noop} onLiveDrag={noop}
            />
          </div>
        )}
      </div>

      <div className={`absolute top-5 right-6 transition-opacity duration-[220ms] ${hintVisible ? "opacity-100" : "opacity-0"}`}>
        <span className="px-2.5 py-1 rounded-md bg-white/10 text-white/70 text-[12px] font-dm-sans">Esc to exit</span>
      </div>

      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 transition-opacity duration-[220ms] ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={() => onNavigate(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
          </svg>
        </button>
        <span className="font-mono text-[13px] text-white/70">{currentSlide + 1} / {total}</span>
        <button
          onClick={() => onNavigate(Math.min(total - 1, currentSlide + 1))}
          disabled={currentSlide === total - 1}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
