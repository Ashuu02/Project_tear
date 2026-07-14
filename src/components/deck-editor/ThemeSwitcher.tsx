"use client";

import { useState, useRef, useEffect } from "react";
import { DECK_THEMES } from "@/lib/deckThemes";
import type { DeckTheme } from "@/types/teardown";

interface ThemeSwitcherProps {
  activeTheme: DeckTheme;
  onApply: (theme: DeckTheme) => void;
}

export default function ThemeSwitcher({ activeTheme, onApply }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] text-white/70 border border-white/15 rounded-md hover:border-white/40 hover:text-white transition-colors"
      >
        <span className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ background: activeTheme.palette.primary }} />
        {activeTheme.name}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 p-1.5 bg-[#221F1D] border border-white/15 rounded-lg shadow-xl flex flex-col gap-0.5">
          {DECK_THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => { onApply(t); setOpen(false); }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
                t.key === activeTheme.key ? "bg-tear-primary/20" : "hover:bg-white/10"
              }`}
            >
              <span className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" style={{ background: t.palette.background }}>
                <span className="block w-full h-full rounded-full" style={{ background: `linear-gradient(135deg, ${t.palette.primary} 50%, transparent 50%)` }} />
              </span>
              <span className="flex flex-col">
                <span className="text-[11px] text-white/80">{t.name}</span>
                <span className="text-[9px] text-white/40">{t.fontHeading}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
