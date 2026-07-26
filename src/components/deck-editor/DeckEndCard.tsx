"use client";

import { useRouter } from "next/navigation";

interface DeckEndCardProps {
  total: number;
  sourcesCount: number;
}

// Shown once the user reaches the last slide via Next — matches the deleted read-only
// viewer's "you've reached the end" card, so there's still a clear exit once you've stepped
// through the whole deck this way (not just via the breadcrumb).
export default function DeckEndCard({ total, sourcesCount }: DeckEndCardProps) {
  const router = useRouter();

  return (
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
  );
}
