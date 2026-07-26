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
      <span className="text-[13.5px] text-tear-text">{label}</span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-tear-border bg-[#F5EFE4] hover:border-tear-primary transition-colors"
      >
        <span className="w-5 h-5 rounded border border-tear-border" style={{ background: safeColor }} />
        <span className="text-[12px] text-tear-text font-mono">{safeColor}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 p-2.5 bg-white border border-tear-border rounded-lg shadow-xl">
          <HexColorPicker color={safeColor} onChange={onChange} />
          <HexColorInput
            color={safeColor}
            onChange={onChange}
            prefixed
            className="mt-2 w-full px-2 py-1 text-[11px] font-mono bg-tear-panel border border-tear-border rounded text-tear-text text-center"
          />
        </div>
      )}
    </div>
  );
}
