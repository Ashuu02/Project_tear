"use client";

import type { ResearchSection } from "@/types/teardown";

const FALLBACK = [
  { id: "exec_summary",      num: "01", label: "Executive Summary" },
  { id: "product_ux",        num: "02", label: "Product & UX" },
  { id: "business_model",    num: "03", label: "Business Model" },
  { id: "pricing_analysis",  num: "04", label: "Pricing Deep-Dive" },
  { id: "gtm_growth",        num: "05", label: "GTM & Growth" },
  { id: "tech_arch",         num: "06", label: "Tech Architecture" },
  { id: "market_comp",       num: "07", label: "Market & Competition" },
  { id: "customer_profiles", num: "08", label: "Customer Profiles" },
  { id: "community",         num: "09", label: "Community & Ecosystem" },
  { id: "financials",        num: "10", label: "Financials & Funding" },
  { id: "swot_analysis",     num: "11", label: "SWOT Analysis" },
  { id: "strategic_outlook", num: "12", label: "Strategic Outlook" },
];

interface SectionSidebarProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
  sections?: ResearchSection[];
}

export default function SectionSidebar({ activeSection, onSectionClick, sections }: SectionSidebarProps) {
  const items = sections?.length
    ? sections.map((s, i) => ({ id: s.id, num: String(i + 1).padStart(2, "0"), label: s.title }))
    : FALLBACK;

  return (
    <div className="w-[216px] flex-shrink-0 border-r border-[#EDE5DC] flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#A89890]">
          {items.length} Sections
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {items.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSectionClick(s.id)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-left mb-0.5
                transition-colors duration-100 cursor-pointer
                ${isActive
                  ? "bg-[#FBF0EB] text-tear-primary"
                  : "text-tear-muted hover:bg-[#F5EFE4] hover:text-tear-text"
                }
              `}
            >
              <span className={`font-mono text-[10px] font-medium flex-shrink-0 ${isActive ? "text-tear-primary" : "text-[#B8ADA8]"}`}>
                {s.num}
              </span>
              <span className="text-[12.5px] font-medium truncate">{s.label}</span>
              {isActive && (
                <div className="ml-auto w-1 h-1 rounded-full bg-tear-primary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[#EDE5DC] flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-[3px] bg-tear-border rounded-full overflow-hidden">
            <div className="w-full h-full bg-tear-primary rounded-full" />
          </div>
        </div>
        <span className="text-[10.5px] text-[#A89890]">Research complete</span>
      </div>
    </div>
  );
}
