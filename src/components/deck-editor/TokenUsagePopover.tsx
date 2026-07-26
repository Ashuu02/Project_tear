"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface TokenUsagePopoverProps {
  sessionId: string;
}

interface TokenTotals {
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export default function TokenUsagePopover({ sessionId }: TokenUsagePopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState<TokenTotals | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tokens/${encodeURIComponent(sessionId)}`);
      const data = await res.json() as Partial<TokenTotals>;
      setTotals({
        totalTokens: data.totalTokens ?? 0,
        totalInputTokens: data.totalInputTokens ?? 0,
        totalOutputTokens: data.totalOutputTokens ?? 0,
      });
    } catch {
      setTotals({ totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0 });
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  function handleToggle() {
    setOpen((o) => {
      const next = !o;
      if (next && totals === null) load();
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={handleToggle} title="Token usage" className="w-[26px] h-[26px] rounded-lg border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors hover:bg-[#F0E8DF]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.2" stroke="#A89890" strokeWidth="1.4" fill="none" />
          <line x1="8" y1="7.2" x2="8" y2="11.2" stroke="#A89890" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="5" r="0.9" fill="#A89890" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 p-3 bg-white border border-tear-border rounded-lg shadow-xl flex flex-col gap-1">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#A89890]">Token usage</span>
          {loading ? (
            <span className="text-[13px] text-tear-muted">Loading…</span>
          ) : (
            <span className="font-mono text-[15px] text-tear-text">{(totals?.totalTokens ?? 0).toLocaleString()}</span>
          )}
          <span className="text-[11px] text-tear-muted">tokens used this session</span>
        </div>
      )}
    </div>
  );
}
