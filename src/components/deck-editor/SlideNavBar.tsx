"use client";

interface SlideNavBarProps {
  total: number;
  currentSlide: number;
  onSelectSlide: (i: number) => void;
}

// Prev/Next + progress-dot bar — matches the deleted read-only viewer's bottom bar exactly,
// since the editor no longer has any inline way to step through slides other than clicking
// the rail (which some users won't discover).
export default function SlideNavBar({ total, currentSlide, onSelectSlide }: SlideNavBarProps) {
  return (
    <div className="flex-shrink-0 border-t border-tear-border px-5 md:px-10 py-3 md:py-3.5 flex items-center justify-between bg-tear-bg gap-2">
      <button
        onClick={() => onSelectSlide(Math.max(0, currentSlide - 1))}
        disabled={currentSlide === 0}
        className="flex items-center gap-1.5 px-3 md:px-4 py-2 text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-tear-border disabled:hover:text-tear-muted whitespace-nowrap"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      <div className="flex items-center gap-1.5 overflow-hidden">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onSelectSlide(i)}
            className={`rounded-full transition-all duration-150 flex-shrink-0 ${
              i === currentSlide ? "w-4 h-1.5 bg-tear-primary" : "w-1.5 h-1.5 bg-tear-border hover:bg-tear-primary/40"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => onSelectSlide(Math.min(total - 1, currentSlide + 1))}
        disabled={currentSlide === total - 1}
        className="flex items-center gap-1.5 px-3 md:px-4 py-2 text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-tear-border disabled:hover:text-tear-muted whitespace-nowrap"
      >
        <span className="hidden sm:inline">Next</span>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
        </svg>
      </button>
    </div>
  );
}
