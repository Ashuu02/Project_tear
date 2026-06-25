export default function PipelineNav({ productName }: { productName: string }) {
  return (
    <nav className="flex items-center justify-between px-10 py-[18px] border-b border-[#EDE5DC] flex-shrink-0 bg-tear-bg z-10">
      <div className="flex items-center gap-2.5">
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-normal text-tear-muted">{productName}</span>
        <span className="text-[13px] text-tear-chip-border">·</span>
        <span className="text-[13px] font-medium text-tear-text">Research in progress</span>
        <div className="pulse-dot" />
      </div>
    </nav>
  );
}
