"use client";

import { useRouter } from "next/navigation";

interface PostDownloadConfirmationProps {
  sessionId: string;
  onDismiss: () => void;
}

export default function PostDownloadConfirmation({ sessionId, onDismiss }: PostDownloadConfirmationProps) {
  const router = useRouter();

  return (
    <div className="flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-5 px-5 md:px-7 py-3 md:py-3.5 bg-[#F5EFE4] border-t border-tear-border">
      <div className="flex items-center gap-3">
        <div className="w-[30px] h-[30px] rounded-full bg-emerald-50 border-[1.5px] border-emerald-200 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 10 10" fill="none">
            <polyline points="2,5 4,7 8,3" stroke="#1A8A4A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-tear-text">Deck downloaded</span>
          <span className="text-[12.5px] text-tear-muted truncate">Your PPTX is ready to share.</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => router.push(`/research/${sessionId}`)}
          className="flex-1 sm:flex-none px-4 py-2 text-[12px] font-medium text-tear-muted bg-tear-bg border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
        >
          Back to teardown doc
        </button>
        <button
          onClick={() => router.push("/")}
          className="flex-1 sm:flex-none px-4 py-2 text-[12px] font-medium text-tear-muted bg-tear-bg border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
        >
          Start a new teardown
        </button>
        <button
          onClick={() => router.push("/my-teardowns")}
          className="flex-1 sm:flex-none px-4 py-2 text-[12px] font-semibold text-white bg-tear-primary rounded-lg hover:bg-tear-primary-dark transition-colors duration-150"
        >
          My teardowns
        </button>
        <button
          onClick={onDismiss}
          title="Dismiss"
          className="bg-transparent border-none cursor-pointer p-1.5 flex rounded-md hover:bg-[#EDE2D4] transition-colors flex-shrink-0"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
