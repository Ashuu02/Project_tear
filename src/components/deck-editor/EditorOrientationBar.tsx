"use client";

import { useSessionStore } from "@/store/session";

export default function EditorOrientationBar() {
  const dismissed = useSessionStore((s) => s.orientationBarDismissed);
  const dismiss = useSessionStore((s) => s.dismissOrientationBar);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-5 px-7 py-2.5 bg-[#F5EFE4] border-b border-tear-border flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-tear-primary flex-shrink-0" />
        <span className="text-[14px] text-tear-text">Your deck is ready. Edit anything you like — or download it as-is.</span>
      </div>
      <button
        onClick={dismiss}
        title="Dismiss"
        className="bg-transparent border-none cursor-pointer p-1 flex rounded-md hover:bg-[#EDE2D4] transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
