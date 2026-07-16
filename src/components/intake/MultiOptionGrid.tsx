"use client";

interface Option {
  id: string;
  label: string;
  sub: string;
}

interface MultiOptionGridProps {
  options: Option[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export default function MultiOptionGrid({ options, selected, onToggle }: MultiOptionGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-up-3">
      {options.map((opt) => {
        const isSelected = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            className={`
              flex flex-col gap-2 p-[18px_20px] rounded-[10px] border-[1.5px] text-left
              transition-all duration-150 cursor-pointer select-none
              ${isSelected
                ? "border-tear-primary bg-[#FBF0EB] shadow-[0_2px_12px_rgba(194,69,30,0.12)]"
                : "border-tear-border bg-[#F5EFE4] hover:border-tear-primary hover:shadow-[0_2px_10px_rgba(194,69,30,0.08)]"
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[14px] font-medium text-tear-text leading-snug">{opt.label}</span>
              <div className={`
                w-5 h-5 rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 mt-0.5
                transition-all duration-150
                ${isSelected ? "bg-tear-primary border-tear-primary" : "border-[#D6CEC8]"}
              `}>
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="2,5 4.2,7.2 8,3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-[13px] font-normal text-tear-muted leading-[1.5]">{opt.sub}</span>
          </button>
        );
      })}
    </div>
  );
}
