"use client";

const DIMENSIONS = [
  {
    id: "ux",
    label: "Product UX & features",
    icon: (selected: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" />
      </svg>
    ),
  },
  {
    id: "biz",
    label: "Business model & revenue",
    icon: (selected: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 14 Q3 6 10 6 Q17 6 17 14" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <line x1="10" y1="6" x2="10" y2="3" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="3" y1="14" x2="17" y2="14" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "gtm",
    label: "Go-to-market & growth",
    icon: (selected: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 17 L8 9 L12 13 L16 5" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="5" r="1.8" fill={selected ? "#C2451E" : "#7C6E68"} />
      </svg>
    ),
  },
  {
    id: "tech",
    label: "Technical architecture",
    icon: (selected: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <polyline points="5,7 2,10 5,13" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <polyline points="15,7 18,10 15,13" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="12" y1="4" x2="8" y2="16" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "comm",
    label: "Community & ecosystem",
    icon: (selected: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="8" r="3" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" />
        <circle cx="14" cy="6" r="2.2" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" />
        <path d="M2 17 Q2 13 7 13 Q12 13 12 17" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M14 10 Q18 10 18 14" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "fin",
    label: "Financials & funding",
    icon: (selected: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="10" width="3" height="7" rx="1" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.3" fill="none" />
        <rect x="8.5" y="6" width="3" height="11" rx="1" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.3" fill="none" />
        <rect x="15" y="3" width="3" height="14" rx="1" stroke={selected ? "#C2451E" : "#7C6E68"} strokeWidth="1.3" fill="none" />
      </svg>
    ),
  },
];

interface DimensionGridProps {
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export default function DimensionGrid({ selected, onToggle }: DimensionGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 animate-fade-up-3">
      {DIMENSIONS.map((dim) => {
        const isSelected = selected.has(dim.id);
        return (
          <button
            key={dim.id}
            onClick={() => onToggle(dim.id)}
            className={`
              flex flex-col gap-2.5 p-[18px_20px] rounded-[10px] border-[1.5px] text-left
              transition-all duration-150 cursor-pointer select-none
              ${isSelected
                ? "border-tear-primary bg-[#FBF0EB] shadow-[0_2px_12px_rgba(194,69,30,0.12)]"
                : "border-tear-border bg-[#F5EFE4] hover:border-tear-primary hover:shadow-[0_2px_10px_rgba(194,69,30,0.08)]"
              }
            `}
          >
            <div className="flex items-start justify-between">
              {dim.icon(isSelected)}
              <div className={`
                w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0
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
            <span className="text-[14px] font-medium text-tear-text leading-[1.35]">{dim.label}</span>
          </button>
        );
      })}
    </div>
  );
}
