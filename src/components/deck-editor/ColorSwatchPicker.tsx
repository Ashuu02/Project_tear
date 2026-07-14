"use client";

import { useState, useRef, useEffect } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";

interface ColorSwatchPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

export default function ColorSwatchPicker({ label, color, onChange }: ColorSwatchPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : "#000000";

  return (
    <div ref={containerRef} className="relative flex items-center justify-between gap-2">
      <span className="text-[11px] text-white/50">{label}</span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-white/15 hover:border-white/30 transition-colors"
      >
        <span className="w-4 h-4 rounded border border-white/20" style={{ background: safeColor }} />
        <span className="text-[11px] text-white/70 font-mono">{safeColor}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 p-2.5 bg-[#221F1D] border border-white/15 rounded-lg shadow-xl">
          <HexColorPicker color={safeColor} onChange={onChange} />
          <HexColorInput
            color={safeColor}
            onChange={onChange}
            prefixed
            className="mt-2 w-full px-2 py-1 text-[11px] font-mono bg-black/30 border border-white/15 rounded text-white/80 text-center"
          />
        </div>
      )}
    </div>
  );
}
