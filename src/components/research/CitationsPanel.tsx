/* eslint-disable @next/next/no-img-element */
"use client";

import type { TeardownSource } from "@/types/teardown";
import { isValidHttpUrl } from "@/lib/utils";

interface CitationsPanelProps {
  sources?: TeardownSource[];
}

const FALLBACK: TeardownSource[] = [
  { num: 1, domain: "product site",         title: "Official product site: pricing, features, changelog",        url: "#", usedIn: "Exec Summary, Product UX" },
  { num: 2, domain: "techcrunch.com",        title: "Funding announcement: valuation & investors",                url: "#", usedIn: "Exec Summary, Financials" },
  { num: 3, domain: "g2.com",               title: "User reviews, last 90 days",                                  url: "#", usedIn: "Product UX" },
  { num: 4, domain: "reddit.com",           title: "Community posts analysis",                                     url: "#", usedIn: "Product UX, Community" },
  { num: 5, domain: "news.ycombinator.com", title: "Engineering deep-dive discussion",                             url: "#", usedIn: "Tech Architecture" },
  { num: 6, domain: "gartner.com",          title: "Market Forecast 2024",                                         url: "#", usedIn: "Market & Competition" },
];

function getFaviconUrl(domain: string): string {
  // Clean domain for favicon fetch
  const cleanDomain = domain.replace(/^www\./, "");
  if (!cleanDomain.includes(".")) {
    // Generic domain like "product site" - no favicon
    return "";
  }
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=16`;
}

function getDomainDisplay(domain: string): string {
  return domain.replace(/^www\./, "");
}

export default function CitationsPanel({ sources }: CitationsPanelProps) {
  const citations = sources?.length ? sources : FALLBACK;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "50%" }}>
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-[#A89890]">
          Sources · {citations.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1.5">
        {citations.map((c) => {
          const faviconUrl = getFaviconUrl(c.domain);
          const displayDomain = getDomainDisplay(c.domain);
          const isClickable = isValidHttpUrl(c.url);

          const content = (
            <div className="flex items-start gap-2 w-full">
              {/* Number */}
              <span className="font-mono text-[10px] text-tear-primary font-medium flex-shrink-0 mt-0.5">
                [{c.num}]
              </span>

              {/* Favicon */}
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt=""
                  width={14}
                  height={14}
                  className="flex-shrink-0 mt-0.5 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-tear-text leading-[1.4] block truncate">
                  {c.title}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[10px] text-tear-primary opacity-70 truncate">
                    {displayDomain}
                  </span>
                  {c.usedIn && (
                    <span className="text-[9.5px] text-[#A89890] bg-[#F5EFE4] px-1.5 py-0.5 rounded-full flex-shrink-0 truncate max-w-[80px]">
                      {c.usedIn.split(",")[0].trim()}
                    </span>
                  )}
                </div>
              </div>

              {/* External link icon */}
              {isClickable && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-1 text-[#B8ADA8]"
                >
                  <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8M8 1h3v3M11 1 5.5 6.5" />
                </svg>
              )}
            </div>
          );

          const baseClass = `
            flex items-start px-2.5 py-2.5 rounded-[8px] border border-tear-border bg-[#F9F5EF]
            transition-all duration-150 group
          `;

          if (isClickable) {
            return (
              <a
                key={c.num}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${baseClass} hover:border-tear-primary hover:bg-[#FBF0EB] hover:border-l-[3px] cursor-pointer`}
                style={{ textDecoration: "none" }}
              >
                {content}
              </a>
            );
          }

          return (
            <div key={c.num} className={baseClass}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
