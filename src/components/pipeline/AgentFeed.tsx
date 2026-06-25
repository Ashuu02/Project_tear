"use client";

import { useState } from "react";

type FeedStatus = "done" | "active" | "queued";

interface FeedItem {
  id: string;
  agent: string;
  message: string;
  url?: string;
  status: FeedStatus;
}

const MOCK_FEED: FeedItem[] = [
  { id: "1", agent: "Question Agent", message: "Intake complete. 9 signals extracted.", status: "done" },
  { id: "2", agent: "Crawler Agent", message: "Fetched product site — pricing, changelog, features", url: "notion.so/pricing", status: "done" },
  { id: "3", agent: "Crawler Agent", message: "Pulled 847 G2 reviews, last 90 days", url: "g2.com/products/notion", status: "done" },
  { id: "4", agent: "Crawler Agent", message: "Checking Reddit r/productivity...", url: "reddit.com/r/productivity", status: "active" },
  { id: "5", agent: "Crawler Agent", message: "App Store reviews — queued", status: "queued" },
  { id: "6", agent: "Backend Agent", message: "Indexing & deduplication — queued", status: "queued" },
  { id: "7", agent: "Document Agent", message: "Drafting teardown — queued", status: "queued" },
];

function DoneIcon() {
  return (
    <div className="w-[18px] h-[18px] rounded-full bg-[#EBF7F0] border-[1.5px] border-[#B8E6CE] flex items-center justify-center flex-shrink-0 mt-px">
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke="#22A05B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

export default function AgentFeed({ productName }: { productName: string }) {
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
        {MOCK_FEED.map((item, i) => (
          <div
            key={item.id}
            className={`
              flex gap-3 py-3.5 border-b border-[#F0E8DF] items-start
              ${item.status === "active" ? "bg-gradient-to-r from-[rgba(194,69,30,0.03)] to-transparent rounded-md" : ""}
              ${item.status === "queued" ? `opacity-${i === 4 ? "55" : i === 5 ? "45" : "35"}` : ""}
            `}
            style={{ animation: `fadeUp 0.35s ease ${0.05 + i * 0.05}s both` }}
          >
            {item.status === "done"   && <DoneIcon />}
            {item.status === "active" && <div className="spinner mt-0.5" />}
            {item.status === "queued" && <QueuedIcon />}

            <div className="flex flex-col gap-0.5">
              <span className={`text-[13px] font-semibold ${item.status === "queued" ? "text-tear-muted" : "text-tear-text"}`}>
                {item.agent}
              </span>
              <span className={`text-[13px] leading-[1.5] ${item.status === "queued" ? "text-[#A89890]" : "text-tear-muted"}`}>
                {item.message}
                {item.status === "active" && <span className="stream-cursor" />}
              </span>
              {item.url && (
                <span className="font-mono text-[11px] text-tear-primary opacity-75 mt-0.5">
                  {item.url}
                </span>
              )}
            </div>
          </div>
        ))}
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
