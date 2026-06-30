"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import { useTeardownHistory, type TeardownHistoryEntry } from "@/store/teardownHistory";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const DEMO_ENTRIES: TeardownHistoryEntry[] = [
  {
    sessionId: "demo-1",
    productName: "Notion",
    category: "Productivity",
    status: "complete",
    description: "Freemium SaaS leader facing per-seat pricing friction at mid-market scale.",
    sourcesCount: 14,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    sessionId: "demo-2",
    productName: "Figma",
    category: "Design tools",
    status: "complete",
    description: "Collaborative design platform with deep network effects post-Adobe deal collapse.",
    sourcesCount: 18,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    sessionId: "demo-3",
    productName: "Shopify",
    category: "E-commerce",
    status: "in-progress",
    description: "Checkout flow teardown — crawling merchant reviews and conversion benchmarks.",
    sourcesCount: 9,
    totalSources: 14,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    sessionId: "demo-4",
    productName: "Linear",
    category: "Dev tools",
    status: "complete",
    description: "Opinionated issue tracker winning teams through speed and craft-led positioning.",
    sourcesCount: 11,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    sessionId: "demo-5",
    productName: "Vision Pro",
    category: "Hardware",
    status: "draft",
    description: "Intake saved — spatial computing bet awaiting your dimension selections.",
    sourcesCount: 0,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    stepSaved: 2,
  },
];

const AVATAR_PALETTE = ["#1A1A1A", "#2A5C2A", "#1E3A8A", "#5B21B6", "#7C2D12", "#164E63"];

function avatarBg(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  if (weeks >= 1) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours >= 1) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  if (mins >= 1) return `${mins} min ago`;
  return "just now";
}

type FilterTab = "all" | "complete" | "in-progress" | "draft";

function StatusBadge({ status }: { status: TeardownHistoryEntry["status"] }) {
  if (status === "complete") {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Complete
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
        Researching
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium text-tear-muted bg-[#EEE8E1] border border-tear-border px-2.5 py-1 rounded-full whitespace-nowrap">
      Draft
    </span>
  );
}

function TeardownCard({ entry }: { entry: TeardownHistoryEntry }) {
  const bg = avatarBg(entry.productName);
  const initial = entry.productName.charAt(0).toUpperCase();
  const progress = entry.totalSources
    ? Math.round((entry.sourcesCount / entry.totalSources) * 100)
    : 0;

  return (
    <div className="bg-[#F0E8DC] border border-tear-border rounded-2xl p-5 flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-base flex-shrink-0"
            style={{ backgroundColor: bg }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[15px] text-tear-text leading-tight truncate">
              {entry.productName}
            </p>
            {entry.category && (
              <p className="text-[12px] text-tear-muted mt-0.5">{entry.category}</p>
            )}
          </div>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <p className="text-[13px] text-tear-text leading-[1.55]">{entry.description}</p>

      {entry.status === "in-progress" ? (
        <div className="flex flex-col gap-2 mt-auto">
          <div className="h-1.5 bg-tear-border rounded-full overflow-hidden">
            <div
              className="h-full bg-tear-primary rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="font-medium text-tear-primary">
              {entry.sourcesCount} / {entry.totalSources ?? "—"} sources
            </span>
            <span className="text-tear-muted">~4 min left</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-3 border-t border-tear-border mt-auto">
          {entry.status === "draft" ? (
            <>
              <span className="text-[12px] text-tear-muted">
                Step {entry.stepSaved ?? 1} of 5 saved
              </span>
              <Link
                href="/"
                className="text-[12px] font-medium text-tear-primary hover:underline"
              >
                Resume →
              </Link>
            </>
          ) : (
            <>
              <span className="text-[12px] font-medium text-tear-primary">
                {entry.sourcesCount} sources
              </span>
              <span className="text-[12px] text-tear-muted">{timeAgo(entry.createdAt)}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NewTeardownCard() {
  return (
    <Link
      href="/"
      className="group border border-dashed border-tear-chip-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-[190px] hover:border-tear-primary/40 transition-colors duration-150 cursor-pointer"
    >
      <div className="w-9 h-9 rounded-full border border-tear-chip-border group-hover:border-tear-primary/40 flex items-center justify-center transition-colors duration-150">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3V13M3 8H13" stroke="#7C6E68" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-tear-text">Start a new teardown</p>
        <p className="text-[12px] text-tear-muted mt-1 leading-relaxed">
          Pick any product and we&apos;ll
          <br />
          research it in minutes
        </p>
      </div>
    </Link>
  );
}

export default function MyTeardownsPage() {
  const { entries: realEntries } = useTeardownHistory();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const entries = DEMO_MODE ? DEMO_ENTRIES : realEntries;

  const filtered = entries.filter((e) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "complete" && e.status === "complete") ||
      (activeFilter === "in-progress" && e.status === "in-progress") ||
      (activeFilter === "draft" && e.status === "draft");
    const matchesSearch =
      searchQuery.trim() === "" ||
      e.productName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalSources = entries.reduce((sum, e) => sum + e.sourcesCount, 0);
  const lastBuilt =
    entries.length > 0
      ? timeAgo(
          [...entries].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].createdAt
        )
      : null;

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "complete", label: "Completed" },
    { id: "in-progress", label: "In progress" },
    { id: "draft", label: "Drafts" },
  ];

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-tear-bg font-dm-sans text-tear-text">
      <div className="border-b border-tear-border">
        <Navbar />
      </div>

      <div className="max-w-[1200px] mx-auto px-10 py-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-lora text-[42px] font-medium tracking-tight text-tear-text leading-tight">
              My teardowns
            </h1>
            {entries.length > 0 && (
              <p className="text-sm text-tear-muted mt-2">
                {entries.length} teardown{entries.length !== 1 ? "s" : ""} · {totalSources} sources
                cited{lastBuilt ? ` · last built ${lastBuilt}` : ""}
              </p>
            )}
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3D1A0A] hover:bg-[#2E1208] text-white text-sm font-medium rounded-xl transition-colors duration-150 mt-1 whitespace-nowrap"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5V11.5M1.5 6.5H11.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            New teardown
          </Link>
        </div>

        {/* Filter tabs + search */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
                  activeFilter === tab.id
                    ? "bg-tear-text text-white font-medium"
                    : "text-tear-muted hover:text-tear-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border border-tear-border rounded-xl px-3 py-2 bg-white/50 w-52">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="flex-shrink-0">
              <circle cx="5.5" cy="5.5" r="4" stroke="#7C6E68" strokeWidth="1.3" />
              <path d="M9 9L11.5 11.5" stroke="#7C6E68" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search teardowns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-tear-text placeholder:text-tear-chip outline-none w-full"
            />
          </div>
        </div>

        <div className="border-t border-tear-border mb-6" />

        {/* Cards */}
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm text-tear-muted">No teardowns yet.</p>
            <Link href="/" className="text-sm text-tear-primary font-medium hover:underline">
              Start your first teardown →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <TeardownCard key={entry.sessionId} entry={entry} />
            ))}
            <NewTeardownCard />
          </div>
        )}
      </div>
    </div>
  );
}
