"use client";

interface MobileSheetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

// Generic bottom-sheet shell for <1024px — wraps existing panel content (InsertPanel,
// PropertiesPanel) unchanged rather than reimplementing their tab/section logic for touch.
export default function MobileSheet({ title, onClose, children }: MobileSheetProps) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-tear-panel rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-tear-border flex-shrink-0">
          <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border-none bg-transparent flex items-center justify-center text-tear-muted hover:bg-[#F0E8DF] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
