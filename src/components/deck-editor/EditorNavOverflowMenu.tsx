"use client";

import { useState, useRef, useEffect } from "react";

interface EditorNavOverflowMenuProps {
  sessionId: string;
  currentSlide: number;
  totalSlides: number;
  autosaveStatus: "idle" | "saving" | "saved" | "error";
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPresent: () => void;
}

interface TokenTotals {
  totalTokens: number;
}

// Below 768px the nav only has room for logo/breadcrumb/Download deck (per the responsive
// spec) — everything else that was inline above 768px (save status, undo/redo, token usage,
// Present) moves in here rather than being dropped.
export default function EditorNavOverflowMenu({
  sessionId, currentSlide, totalSlides, autosaveStatus, canUndo, canRedo, onUndo, onRedo, onPresent,
}: EditorNavOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<TokenTotals | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleToggle() {
    setOpen((o) => {
      const next = !o;
      if (next && tokens === null && sessionId) {
        fetch(`/api/tokens/${encodeURIComponent(sessionId)}`)
          .then((res) => res.json())
          .then((data: Partial<TokenTotals>) => setTokens({ totalTokens: data.totalTokens ?? 0 }))
          .catch(() => setTokens({ totalTokens: 0 }));
      }
      return next;
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        title="More"
        className="w-8 h-8 rounded-lg border-none bg-transparent flex items-center justify-center text-tear-muted hover:bg-[#F0E8DF] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 p-1.5 bg-white border border-tear-border rounded-lg shadow-xl flex flex-col gap-0.5">
          <div className="px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[12px] text-tear-muted">Slide</span>
            <span className="font-mono text-[12px] text-tear-text">{currentSlide + 1} / {totalSlides}</span>
          </div>
          <div className="px-2.5 py-1.5 flex items-center justify-between">
            <span className="text-[12px] text-tear-muted">Status</span>
            <span className={`font-mono text-[11px] ${autosaveStatus === "error" ? "text-[#B45309]" : "text-tear-muted"}`}>
              {autosaveStatus === "saving" && "Saving…"}
              {autosaveStatus === "error" && "Couldn't save"}
              {(autosaveStatus === "saved" || autosaveStatus === "idle") && "All changes saved"}
            </span>
          </div>
          {tokens && (
            <div className="px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[12px] text-tear-muted">Tokens used</span>
              <span className="font-mono text-[11px] text-tear-text">{tokens.totalTokens.toLocaleString()}</span>
            </div>
          )}
          <div className="h-px bg-tear-border my-0.5" />
          <button
            onClick={() => { onUndo(); setOpen(false); }}
            disabled={!canUndo}
            className="px-2.5 py-2 text-left text-[12px] text-tear-text rounded-md hover:bg-tear-panel disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={() => { onRedo(); setOpen(false); }}
            disabled={!canRedo}
            className="px-2.5 py-2 text-left text-[12px] text-tear-text rounded-md hover:bg-tear-panel disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Redo
          </button>
          <button
            onClick={() => { onPresent(); setOpen(false); }}
            className="px-2.5 py-2 text-left text-[12px] text-tear-text rounded-md hover:bg-tear-panel"
          >
            Present
          </button>
        </div>
      )}
    </div>
  );
}
