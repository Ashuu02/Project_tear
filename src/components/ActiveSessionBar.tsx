"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSessionStore } from "@/store/session";

export default function ActiveSessionBar() {
  const router             = useRouter();
  const pathname           = usePathname();
  const activeSession      = useSessionStore((s) => s.activeSession);
  const clearActiveSession = useSessionStore((s) => s.clearActiveSession);

  if (!activeSession) return null;
  if (
    pathname.startsWith("/pipeline/") ||
    pathname.startsWith("/research/") ||
    pathname.startsWith("/tier2/")
  ) return null;

  function handleResume() {
    if (!activeSession) return;
    router.push(activeSession.resumePath);
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    clearActiveSession();
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      {/* thin progress track */}
      <div className="h-[2px] bg-[#2C2220] w-full">
        <div
          className="h-full bg-tear-primary transition-all duration-700 ease-out"
          style={{ width: `${activeSession.progress}%` }}
        />
      </div>

      <div
        className="bg-[#1C1412] px-6 py-3.5 flex items-center justify-between cursor-pointer"
        onClick={handleResume}
      >
        <div className="flex items-center gap-3">
          <div className="pulse-dot" />
          <div className="flex items-center gap-2">
            <span className="text-white text-[13px] font-semibold font-dm-sans">
              {activeSession.productName}
            </span>
            <span className="text-[#4A3F3A] text-[13px]">·</span>
            <span className="text-[#A89890] text-[13px] font-dm-sans">
              Paused · {activeSession.stageLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResume}
            className="flex items-center gap-1.5 px-3.5 py-[6px] text-[12px] font-semibold text-white bg-tear-primary rounded-lg hover:bg-tear-primary-dark transition-colors duration-150"
          >
            Resume
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
            </svg>
          </button>
          <button
            onClick={handleDismiss}
            className="text-[#4A3F3A] hover:text-[#A89890] transition-colors duration-150 p-1.5"
            aria-label="Dismiss"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l10 10M12 2 2 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
