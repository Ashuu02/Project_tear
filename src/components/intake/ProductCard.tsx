export default function ProductCard({ productName }: { productName: string }) {
  const initial = productName.charAt(0).toUpperCase();

  return (
    <div className="bg-[#F5EFE4] border-[1.5px] border-tear-border rounded-xl px-5 py-4 flex items-center justify-between animate-fade-up-1">
      <div className="flex items-center gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-tear-text flex items-center justify-center flex-shrink-0">
          <span className="font-lora text-[18px] font-semibold text-tear-bg leading-none">{initial}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-lora text-xl font-medium text-tear-text leading-snug">{productName}</span>
          <span className="text-[13px] font-normal text-tear-muted">Product confirmed</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-[#EBF7F0] border border-[#B8E6CE] rounded-full px-3 py-[5px]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5.5" fill="#22A05B" fillOpacity="0.15" stroke="#22A05B" strokeWidth="1.2" />
          <polyline points="3.5,6.2 5.2,7.8 8.5,4.5" stroke="#22A05B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <span className="text-xs font-medium text-[#1A8A4A] tracking-[0.01em]">Confirmed</span>
      </div>
    </div>
  );
}
