"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import DeckNav from "@/components/deck/DeckNav";
import SlideThumbnails from "@/components/deck/SlideThumbnails";
import SlideCanvas, { getMockSlides, getSlidesInfo } from "@/components/deck/SlideCanvas";
import { getMockDeckData } from "@/data/mockPipeline";

export default function DeckPage() {
  const router      = useRouter();
  const productName = useSessionStore((s) => s.productName);
  const sessionId   = useSessionStore((s) => s.sessionId);
  const deckData    = useSessionStore((s) => s.deckData);

  const [ready, setReady]               = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  const slides = deckData
    ? getSlidesInfo(deckData)
    : productName ? getMockSlides(productName) : [];
  const total = slides.length;

  const prev = useCallback(() => setCurrentSlide((s) => Math.max(0, s - 1)), []);
  const next = useCallback(() => setCurrentSlide((s) => Math.min(total - 1, s + 1)), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  async function handleDownloadPptx() {
    const data = deckData ?? getMockDeckData(productName);
    const { downloadPptx } = await import("@/lib/downloadPptx");
    await downloadPptx(productName, data);
  }

  if (!ready || !productName) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <DeckNav
        productName={productName}
        sessionId={sessionId}
        currentSlide={currentSlide}
        totalSlides={total}
        onDownloadPptx={handleDownloadPptx}
      />

      <div className="flex-1 flex overflow-hidden">
        <SlideThumbnails slides={slides} current={currentSlide} onSelect={setCurrentSlide} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SlideCanvas productName={productName} slideIndex={currentSlide} />

          <div className="flex-shrink-0 border-t border-[#EDE5DC] px-10 py-3.5 flex items-center justify-between bg-tear-bg">
            <button
              onClick={prev}
              disabled={currentSlide === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-tear-border disabled:hover:text-tear-muted"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
              </svg>
              Previous
            </button>

            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full transition-all duration-150 ${
                    i === currentSlide
                      ? "w-4 h-1.5 bg-tear-primary"
                      : "w-1.5 h-1.5 bg-tear-border hover:bg-tear-primary/40"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              disabled={currentSlide === total - 1}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-tear-border disabled:hover:text-tear-muted"
            >
              Next
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
