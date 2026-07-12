"use client";

import { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  busyLabel: string | null;
  onDownloadPptx: () => void;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
}

export default function ExportMenu({ busyLabel, onDownloadPptx, onDownloadPdf, onDownloadPng }: ExportMenuProps) {
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

  const busy = busyLabel !== null;

  function run(fn: () => void) {
    fn();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="px-3 py-1 text-[12px] font-medium text-white bg-tear-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? busyLabel : "Export ▾"}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 p-1 bg-[#221F1D] border border-white/15 rounded-lg shadow-xl flex flex-col gap-0.5">
          <button onClick={() => run(onDownloadPptx)} className="px-3 py-2 text-left text-[12px] text-white/80 rounded-md hover:bg-white/10">
            Download PPTX
          </button>
          <button onClick={() => run(onDownloadPdf)} className="px-3 py-2 text-left text-[12px] text-white/80 rounded-md hover:bg-white/10">
            Download PDF
          </button>
          <button onClick={() => run(onDownloadPng)} className="px-3 py-2 text-left text-[12px] text-white/80 rounded-md hover:bg-white/10">
            Download PNG (current slide)
          </button>
        </div>
      )}
    </div>
  );
}
