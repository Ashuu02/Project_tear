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
    <nav className="flex items-center justify-between px-10 py-[18px] border-b border-[#EDE5DC] flex-shrink-0 bg-tear-bg z-10">
      <Link href="/" className="flex items-center gap-2.5">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-[13px] font-normal text-tear-muted">{productName}</span>
        <span className="text-[13px] text-tear-chip-border mx-1">·</span>
        <span className="text-[13px] font-medium text-tear-text">Teardown Deck</span>
        <span className="text-[13px] text-tear-chip-border mx-1">·</span>
        <span className="font-mono text-[12px] text-tear-primary font-medium">
          {currentSlide + 1} / {totalSlides}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => router.push(`/research/${sessionId}`)}
          className="flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
          </svg>
          Research Doc
        </button>
        <button
          onClick={onDownloadPptx}
          className="flex items-center gap-1.5 px-4 py-[7px] text-[12px] font-semibold text-white bg-tear-primary rounded-lg hover:bg-tear-primary-dark transition-colors duration-150"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 1v7.5M4.5 6.5 7 9l2.5-2.5" />
            <path d="M1.5 10.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
          </svg>
          Download PPTX
        </button>
      </div>
    </nav>
  );
}
