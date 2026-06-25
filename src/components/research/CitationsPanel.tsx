"use client";

import type { TeardownSource } from "@/types/teardown";

interface CitationsPanelProps {
  sources?: TeardownSource[];
}

const FALLBACK: TeardownSource[] = [
  { num: 1, domain: "product site",          title: "Official product site — pricing, features, changelog",          url: "#", usedIn: "Exec Summary, Product UX" },
  { num: 2, domain: "techcrunch.com",         title: "Funding announcement — valuation & investors",                  url: "#", usedIn: "Exec Summary, Financials" },
  { num: 3, domain: "g2.com",                title: "User reviews — last 90 days",                                   url: "#", usedIn: "Product UX" },
  { num: 4, domain: "reddit.com",            title: "Community posts analysis",                                      url: "#", usedIn: "Product UX, Community" },
  { num: 5, domain: "news.ycombinator.com",  title: "Engineering deep-dive discussion",                              url: "#", usedIn: "Tech Architecture" },
  { num: 6, domain: "gartner.com",           title: "Market Forecast 2024",                                          url: "#", usedIn: "Market & Competition" },
];

export default function CitationsPanel({ sources }: CitationsPanelProps) {
  const citations = sources?.length ? sources : FALLBACK;

  return (
    <div className="w-[256px] flex-shrink-0 border-l border-[#EDE5DC] flex flex-col overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex-shrink-0">
        <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-[#A89890]">
          Sources · {citations.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {citations.map((c) => (
          <div
            key={c.num}
            className="px-3 py-3 rounded-[8px] border border-tear-border bg-[#F9F5EF] hover:border-tear-primary hover:bg-[#FBF0EB] transition-colors duration-150 cursor-pointer"
          >
            <div className="flex items-start gap-2 mb-1">
              <span className="font-mono text-[10px] text-tear-primary font-medium flex-shrink-0 mt-0.5">
                [{c.num}]
              </span>
              <span className="text-[11.5px] font-medium text-tear-text leading-[1.4]">{c.title}</span>
            </div>
            <span className="font-mono text-[10px] text-tear-primary opacity-70 block mb-1 ml-5">
              {c.domain}
            </span>
            <span className="text-[10.5px] text-[#A89890] ml-5 leading-[1.3]">{c.usedIn}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
