"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface DeckNavProps {
  productName: string;
  sessionId: string;
  currentSlide: number;
  totalSlides: number;
  onDownloadPptx: () => void;
}

export default function DeckNav({ productName, sessionId, currentSlide, totalSlides, onDownloadPptx }: DeckNavProps) {
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between px-5 md:px-10 py-4 md:py-[18px] border-b border-[#EDE5DC] flex-shrink-0 bg-tear-bg gap-2">
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
      </Link>

      <div className="hidden md:flex items-center gap-2 min-w-0">
        <span className="text-[13px] font-normal text-tear-muted truncate">{productName}</span>
        <span className="text-[13px] text-tear-chip-border mx-1">·</span>
        <span className="text-[13px] font-medium text-tear-text whitespace-nowrap">Teardown Deck</span>
        <span className="text-[13px] text-tear-chip-border mx-1">·</span>
        <span className="font-mono text-[12px] text-tear-primary font-medium whitespace-nowrap">
          {currentSlide + 1} / {totalSlides}
        </span>
      </div>

      <span className="md:hidden font-mono text-[12px] text-tear-primary font-medium flex-shrink-0">
        {currentSlide + 1} / {totalSlides}
      </span>

      <div className="flex items-center gap-1.5 md:gap-2.5 flex-shrink-0">
        <button
          onClick={() => router.push(`/research/${sessionId}`)}
          aria-label="Research Doc"
          className="flex items-center gap-1.5 px-2.5 md:px-3.5 py-[7px] text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
          </svg>
          <span className="hidden md:inline">Research Doc</span>
        </button>
        <button
          onClick={() => router.push(`/deck/${sessionId}/edit`)}
          aria-label="Edit Deck"
          className="flex items-center gap-1.5 px-2.5 md:px-3.5 py-[7px] text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2 12 4.5 5 11.5 2 12l0.5-3Z" />
          </svg>
          <span className="hidden md:inline">Edit Deck</span>
        </button>
        <button
          onClick={onDownloadPptx}
          className="flex items-center gap-1.5 px-3 md:px-4 py-[7px] text-[12px] font-semibold text-white bg-tear-primary rounded-lg hover:bg-tear-primary-dark transition-colors duration-150 whitespace-nowrap"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v7.5M4.5 6.5 7 9l2.5-2.5" />
            <path d="M1.5 10.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
          </svg>
          <span className="hidden md:inline">Download PPTX</span>
          <span className="md:hidden">PPTX</span>
        </button>
      </div>
    </nav>
  );
}
