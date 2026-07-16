import Link from "next/link";

interface PipelineNavProps {
  productName: string;
  onStop?: () => void;
}

export default function PipelineNav({ productName, onStop }: PipelineNavProps) {
  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between px-5 md:px-10 py-4 md:py-[18px] border-b border-[#EDE5DC] flex-shrink-0 bg-tear-bg gap-2">
      <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
      </Link>

      <div className="hidden sm:flex items-center gap-2.5 min-w-0">
        <span className="text-[13px] font-normal text-tear-muted truncate">{productName}</span>
        <span className="text-[13px] text-tear-chip-border">·</span>
        {onStop ? (
          <>
            <span className="text-[13px] font-medium text-tear-text whitespace-nowrap">Research in progress</span>
            <div className="pulse-dot" />
          </>
        ) : (
          <span className="text-[13px] font-medium text-tear-muted whitespace-nowrap">Stopped</span>
        )}
      </div>

      {/* Mobile-only compact status dot */}
      {onStop && (
        <div className="sm:hidden flex items-center gap-1.5 flex-shrink-0">
          <div className="pulse-dot" />
        </div>
      )}

      {onStop && (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3.5 py-[7px] text-[12px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-red-400 hover:text-red-500 transition-colors duration-150 flex-shrink-0"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="2" width="8" height="8" rx="1.5" />
          </svg>
          Stop
        </button>
      )}
    </nav>
  );
}
