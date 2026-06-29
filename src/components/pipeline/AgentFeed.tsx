"use client";

import { useState } from "react";

export type FeedStatus = "done" | "active" | "queued" | "error";

export interface FeedItem {
  id: string;
  agent: string;
  message: string;
  url?: string;
  findings?: string;
  status: FeedStatus;
}

function DoneIcon() {
  return (
    <div className="w-[18px] h-[18px] rounded-full bg-[#EBF7F0] border-[1.5px] border-[#B8E6CE] flex items-center justify-center flex-shrink-0 mt-px">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke="#22A05B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div className="w-[18px] h-[18px] rounded-full bg-[#FEF0EE] border-[1.5px] border-[#F5C6C0] flex items-center justify-center flex-shrink-0 mt-px">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <line x1="2" y1="2" x2="7" y2="7" stroke="#E53E3E" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="7" y1="2" x2="2" y2="7" stroke="#E53E3E" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function QueuedIcon() {
  return (
    <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#D6CEC8] flex items-center justify-center flex-shrink-0 mt-px">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="4" stroke="#A89890" strokeWidth="1.2" />
        <polyline points="5,2.5 5,5 6.8,6.2" stroke="#A89890" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

interface AgentFeedProps {
  productName: string;
  feedItems: FeedItem[];
}

export default function AgentFeed({ productName, feedItems }: AgentFeedProps) {
  const [askValue, setAskValue] = useState("");

  return (
    <div className="w-[55%] flex flex-col border-r border-[#EDE5DC] overflow-hidden">
      {/* Panel header */}
      <div className="px-8 pt-5 pb-3.5 flex-shrink-0">
        <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">
          Research Agents
        </span>
      </div>

      {/* Scrollable feed */}
      <div className="flex-1 overflow-y-auto px-8 pb-2 flex flex-col">
        {feedItems.map((item, i) => {
          const isCrawlItem = item.agent === "Crawler Agent" && !!item.url;

          return (
            <div
              key={item.id}
              className={`
                flex gap-3 py-3.5 border-b border-[#F0E8DF] items-start
                ${item.status === "active" ? "bg-gradient-to-r from-[rgba(194,69,30,0.03)] to-transparent rounded-md" : ""}
                ${item.status === "queued" ? "opacity-40" : ""}
              `}
              style={{ animation: `fadeUp 0.35s ease ${0.05 + i * 0.04}s both` }}
            >
              {item.status === "done"   && <DoneIcon />}
              {item.status === "active" && <div className="spinner mt-0.5" />}
              {item.status === "queued" && <QueuedIcon />}
              {item.status === "error"  && <ErrorIcon />}

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={`text-[13px] font-semibold ${item.status === "queued" ? "text-tear-muted" : "text-tear-text"}`}>
                  {item.agent}
                </span>
                <span className={`text-[13px] leading-[1.5] break-words ${item.status === "queued" ? "text-[#A89890]" : "text-tear-muted"}`}>
                  {item.message}
                  {item.status === "active" && <span className="stream-cursor" />}
                </span>

                {/* Crawl-specific: domain + URL + findings */}
                {isCrawlItem && (
                  <div className="mt-0.5">
                    <span className="font-mono text-[11px] font-semibold text-tear-primary">
                      {item.url}
                    </span>
                    {item.findings && (
                      <span className="block text-[11.5px] italic text-tear-muted mt-0.5 leading-[1.4]">
                        {item.findings}
                      </span>
                    )}
                  </div>
                )}

                {/* Non-crawl URL display */}
                {!isCrawlItem && item.url && (
                  <span className="font-mono text-[11px] text-tear-primary opacity-75 mt-0.5">
                    {item.url}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ask anything */}
      <div className="px-8 py-4 pb-6 border-t border-[#EDE5DC] flex-shrink-0 flex items-center gap-2.5">
        <span className="text-[13px] italic text-[#A89890] whitespace-nowrap">Ask anything →</span>
        <input
          type="text"
          value={askValue}
          onChange={(e) => setAskValue(e.target.value)}
          placeholder={`e.g. What's ${productName}'s main pricing tier?`}
          className="flex-1 px-3.5 py-2.5 font-dm-sans text-[13px] text-tear-text bg-[#F5EFE4] border-[1.5px] border-tear-border rounded-lg placeholder:text-[#B8ADA8] focus:outline-none focus:border-tear-primary transition-colors duration-150"
        />
      </div>
    </div>
  );
}
