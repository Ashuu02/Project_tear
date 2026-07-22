"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import DeckNav from "@/components/deck/DeckNav";
import SlideThumbnails from "@/components/deck/SlideThumbnails";
import SlideCanvas, { getMockSlides, getSlidesInfo } from "@/components/deck/SlideCanvas";
import { getMockDeckData } from "@/data/mockPipeline";
import { track } from "@/lib/posthog";

export default function DeckPage() {
  const router      = useRouter();
  const productName = useSessionStore((s) => s.productName);
  const sessionId   = useSessionStore((s) => s.sessionId);
  const deckData    = useSessionStore((s) => s.deckData);
  const researchDoc = useSessionStore((s) => s.researchDoc);

  const [ready, setReady]               = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const trackedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  useEffect(() => {
    if (ready && productName && !trackedRef.current) {
      trackedRef.current = true;
      track("deck_viewed", { product_name: productName });
    }
  }, [ready, productName]);

  const slides = deckData
    ? getSlidesInfo(deckData)
    : productName ? getMockSlides(productName) : [];
  const total = slides.length;
  const isLastSlide = total > 0 && currentSlide === total - 1;
  const sourcesSlide = deckData?.slides.find((s) => s.type === "sources");
  const sourcesCount = researchDoc?.sources?.length ?? sourcesSlide?.sources?.length ?? 0;

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
    await downloadPptx(productName, data, sessionId);
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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <SlideThumbnails slides={slides} current={currentSlide} onSelect={setCurrentSlide} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <SlideCanvas productName={productName} slideIndex={currentSlide} />

          {isLastSlide && (
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-5 px-5 md:px-10 py-3 md:py-3.5 bg-[#F5EFE4] border-t border-tear-border">
              <div className="flex items-center gap-3">
                <div className="w-[30px] h-[30px] rounded-full bg-emerald-50 border-[1.5px] border-emerald-200 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
                    <polyline points="2,5 4,7 8,3" stroke="#1A8A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-tear-text">You&apos;ve reached the end</span>
                  <span className="text-[12.5px] text-tear-muted truncate">
                    {total} slides · {sourcesCount} sources cited · ready to share
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => router.push("/my-teardowns")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-medium text-tear-muted bg-tear-bg border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4.5 C2 3.7 2.7 3 3.5 3 H6 L7.3 4.3 H12.5 C13.3 4.3 14 5 14 5.8 V11.5 C14 12.3 13.3 13 12.5 13 H3.5 C2.7 13 2 12.3 2 11.5 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  My teardowns
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-tear-primary rounded-lg hover:bg-tear-primary-dark transition-colors duration-150"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="2.5" y1="8" x2="13.5" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  New teardown
                </button>
              </div>
            </div>
          )}

          <div className="flex-shrink-0 border-t border-[#EDE5DC] px-5 md:px-10 py-3 md:py-3.5 flex items-center justify-between bg-tear-bg gap-2">
            <button
              onClick={prev}
              disabled={currentSlide === 0}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-tear-border disabled:hover:text-tear-muted whitespace-nowrap"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-1.5 overflow-hidden">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`rounded-full transition-all duration-150 flex-shrink-0 ${
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
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-tear-border disabled:hover:text-tear-muted whitespace-nowrap"
            >
              <span className="hidden sm:inline">Next</span>
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
