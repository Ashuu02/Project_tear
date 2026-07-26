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
        className="inline-flex items-center gap-2 px-[17px] py-[9px] rounded-lg border-none bg-tear-primary text-tear-bg font-dm-sans text-[13px] font-medium cursor-pointer transition-colors hover:bg-tear-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (
          busyLabel
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <line x1="8" y1="2.5" x2="8" y2="10" stroke="#FDFAF6" strokeWidth="1.5" strokeLinecap="round" />
              <polyline points="4.8,7 8,10.3 11.2,7" stroke="#FDFAF6" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="4" y1="13.2" x2="12" y2="13.2" stroke="#FDFAF6" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Download deck
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 1 }}>
              <polyline points="2,3.8 5,6.6 8,3.8" stroke="#FDFAF6" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 p-1 bg-white border border-tear-border rounded-lg shadow-xl flex flex-col gap-0.5">
          <button onClick={() => run(onDownloadPptx)} className="px-3 py-2 text-left text-[12px] text-tear-text rounded-md hover:bg-tear-panel">
            Download PPTX
          </button>
          <button onClick={() => run(onDownloadPdf)} className="px-3 py-2 text-left text-[12px] text-tear-text rounded-md hover:bg-tear-panel">
            Download PDF
          </button>
          <button onClick={() => run(onDownloadPng)} className="px-3 py-2 text-left text-[12px] text-tear-text rounded-md hover:bg-tear-panel">
            Download PNG (current slide)
          </button>
        </div>
      )}
    </div>
  );
}
