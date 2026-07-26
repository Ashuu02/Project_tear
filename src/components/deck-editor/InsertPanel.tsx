"use client";

import { useState, useRef } from "react";
import ChartInsertModal from "@/components/deck-editor/ChartInsertModal";
import { newTextElement, newShapeElement, newImageElement, newChartElement, type TextPreset, type ShapeKind } from "@/lib/newCanvasElement";
import { iconToDataUri, ICON_LIBRARY } from "@/lib/iconToDataUri";
import { getBlankSlide, templateLabel, TEMPLATE_TYPES } from "@/lib/blankSlideTemplates";
import { deckSlideToCanvasSlide } from "@/lib/deckSlideToCanvasSlide";
import { useSessionStore, type InsertTab } from "@/store/session";
import * as LucideIcons from "lucide-react";
import type { CanvasElement, CanvasSlide, DeckTheme, ResearchDoc } from "@/types/teardown";

interface InsertPanelProps {
  theme: DeckTheme;
  productName: string;
  researchDoc: ResearchDoc | null;
  currentSlide: CanvasSlide | undefined;
  nextZIndex: number;
  onInsertElement: (el: CanvasElement) => void;
  onInsertSlide: (slide: CanvasSlide) => void;
  /** "panel" (default) is the desktop column with its own collapse/expand chrome and side
   *  border. "sheet" is for embedding inside a <1024px MobileSheet — always expanded, full
   *  width, no side border (the sheet already provides its own chrome). */
  variant?: "panel" | "sheet";
}

const TABS: { key: InsertTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "templates", label: "Templates",
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor">
        <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.2" strokeWidth="1.4" fill="none" />
        <rect x="10" y="2.5" width="5.5" height="5.5" rx="1.2" strokeWidth="1.4" fill="none" />
        <rect x="2.5" y="10" width="5.5" height="5.5" rx="1.2" strokeWidth="1.4" fill="none" />
        <rect x="10" y="10" width="5.5" height="5.5" rx="1.2" strokeWidth="1.4" fill="none" />
      </svg>
    ),
  },
  {
    key: "text", label: "Text",
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor">
        <line x1="4" y1="4" x2="14" y2="4" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="9" y1="4" x2="9" y2="14.5" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "shapes", label: "Shapes",
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor">
        <rect x="2.5" y="6" width="7.5" height="7.5" rx="1.2" strokeWidth="1.4" fill="none" />
        <circle cx="12" cy="6.5" r="3.6" strokeWidth="1.4" fill="none" />
      </svg>
    ),
  },
  {
    key: "charts", label: "Charts",
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor">
        <rect x="2.5" y="10" width="3" height="5" rx="0.8" strokeWidth="1.3" fill="none" />
        <rect x="7.5" y="6" width="3" height="9" rx="0.8" strokeWidth="1.3" fill="none" />
        <rect x="12.5" y="3" width="3" height="12" rx="0.8" strokeWidth="1.3" fill="none" />
      </svg>
    ),
  },
  {
    key: "images", label: "Images",
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor">
        <rect x="2.5" y="3.5" width="13" height="11" rx="1.6" strokeWidth="1.4" fill="none" />
        <circle cx="6.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
        <polyline points="4,13 7.5,9.5 11,12 13.5,9.5 15.5,11.5" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "icons", label: "Icons",
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor">
        <path d="M9 2.8 L10.6 6.9 L15 7.4 L11.7 10.2 L12.7 14.5 L9 12.2 L5.3 14.5 L6.3 10.2 L3 7.4 L7.4 6.9 Z" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function readImageFile(file: File): Promise<{ src: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => resolve({ src, w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function InsertPanel({ theme, productName, researchDoc, currentSlide, nextZIndex, onInsertElement, onInsertSlide, variant = "panel" }: InsertPanelProps) {
  const storedCollapsed = useSessionStore((s) => s.toolPanelCollapsed);
  const setCollapsed = useSessionStore((s) => s.setToolPanelCollapsed);
  const collapsed = variant === "sheet" ? false : storedCollapsed;
  const storedTab = useSessionStore((s) => s.toolPanelActiveTab);
  const setStoredTab = useSessionStore((s) => s.setToolPanelActiveTab);
  const tab = storedTab ?? "templates";

  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function selectTab(t: InsertTab) {
    setStoredTab(t);
    setCollapsed(false);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { src, w, h } = await readImageFile(file);
      onInsertElement(newImageElement(src, w, h, nextZIndex));
    } catch {
      // Non-fatal — user can retry with a different file.
    } finally {
      setUploading(false);
    }
  }

  if (collapsed) {
    return (
      <div className="w-14 flex-shrink-0 bg-tear-panel border-r border-tear-border flex flex-col items-center gap-1 pt-2.5 pb-3.5 overflow-hidden">
        <button
          onClick={() => setCollapsed(false)}
          title="Open editing tools"
          className="w-[38px] h-[38px] rounded-lg border border-tear-border bg-[#F5EFE4] flex items-center justify-center text-tear-primary hover:bg-[#F0E8DF] transition-colors"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <rect x="2.5" y="3" width="13" height="12" rx="1.6" stroke="#C2451E" strokeWidth="1.4" fill="none" />
            <line x1="7" y1="3" x2="7" y2="15" stroke="#C2451E" strokeWidth="1.4" />
            <polyline points="10,7.5 12,9.5 10,11.5" stroke="#C2451E" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="w-6 h-px bg-tear-border my-1" />
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            title={t.label}
            className={`w-[38px] h-[38px] rounded-lg border flex items-center justify-center transition-colors ${
              tab === t.key ? "bg-[#FFF7ED] border-[#F0C9B8] text-tear-primary" : "border-transparent text-tear-muted hover:bg-[#F0E8DF]"
            }`}
          >
            {t.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={variant === "sheet" ? "w-full flex flex-col overflow-hidden" : "w-[258px] flex-shrink-0 bg-tear-panel border-r border-tear-border flex flex-col overflow-hidden"}>
      {variant === "panel" && (
        <div className="flex items-center justify-between gap-2 pl-3.5 pr-3 py-[11px] border-b border-tear-border flex-shrink-0">
          <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">Edit slide</span>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse panel"
            className="w-[26px] h-[26px] rounded-lg border-none bg-transparent flex items-center justify-center text-tear-muted hover:bg-[#F0E8DF] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <rect x="2.5" y="3" width="13" height="12" rx="1.6" stroke="#7C6E68" strokeWidth="1.4" fill="none" />
              <line x1="7" y1="3" x2="7" y2="15" stroke="#7C6E68" strokeWidth="1.4" />
              <polyline points="12,7.5 10,9.5 12,11.5" stroke="#7C6E68" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 px-3 py-2.5 border-b border-tear-border flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStoredTab(t.key)}
            className={`py-[7px] px-1 text-[12px] rounded-md text-center transition-colors border ${
              tab === t.key
                ? "text-tear-primary font-medium bg-[#FFF7ED] border-[#F0C9B8]"
                : "text-tear-muted border-transparent hover:text-tear-text hover:bg-[#F0E8DF]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "templates" && (
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onInsertSlide(deckSlideToCanvasSlide(getBlankSlide(type, productName), theme, 0))}
                className="flex flex-col gap-1.5 group"
              >
                <div className="w-full aspect-[16/10] rounded-md border border-tear-border bg-[#F5EFE4] transition-colors group-hover:border-tear-primary group-hover:shadow-[0_2px_8px_rgba(194,69,30,0.09)]" style={{ background: theme.palette.background }} />
                <span className="text-[12px] text-tear-muted text-center leading-tight group-hover:text-tear-text">{templateLabel(type)}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "text" && (
          <div className="flex flex-col gap-2">
            {(["heading", "subheading", "body", "bullet"] as TextPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => onInsertElement(newTextElement(preset, theme, nextZIndex, currentSlide))}
                className="px-3 py-2.5 text-left rounded-md border border-tear-border bg-white hover:border-tear-primary hover:bg-[#FBF4EE] transition-colors"
              >
                <span className={preset === "heading" ? "text-[16px] font-bold text-tear-text" : preset === "subheading" ? "text-[13px] font-bold text-tear-text/80" : "text-[11px] text-tear-muted"}>
                  {preset === "heading" ? "Add a heading" : preset === "subheading" ? "Add a subheading" : preset === "body" ? "Add body text" : "Add a bullet point"}
                </span>
              </button>
            ))}
          </div>
        )}

        {tab === "shapes" && (
          <div className="grid grid-cols-2 gap-2">
            {(["rect", "ellipse", "line", "arrow"] as ShapeKind[]).map((shape) => (
              <button
                key={shape}
                onClick={() => onInsertElement(newShapeElement(shape, theme, nextZIndex))}
                className="flex items-center justify-center aspect-square rounded-lg border border-tear-border bg-white hover:border-tear-primary hover:bg-[#FBF4EE] transition-colors"
              >
                {shape === "rect" && <div className="w-8 h-6 rounded" style={{ background: theme.palette.primary }} />}
                {shape === "ellipse" && <div className="w-8 h-8 rounded-full" style={{ background: theme.palette.primary }} />}
                {shape === "line" && <div className="w-10 h-[3px]" style={{ background: theme.palette.primary }} />}
                {shape === "arrow" && (
                  <svg width="40" height="16" viewBox="0 0 40 16" fill="none">
                    <line x1="2" y1="8" x2="32" y2="8" stroke={theme.palette.primary} strokeWidth="3" />
                    <polygon points="32,2 40,8 32,14" fill={theme.palette.primary} />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {tab === "charts" && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setChartModalOpen(true)}
              className="px-3 py-2.5 text-[12px] font-medium text-tear-bg bg-tear-primary rounded-md hover:bg-tear-primary-dark transition-colors"
            >
              + Insert chart
            </button>
            <p className="text-[11px] text-tear-muted leading-relaxed">
              Bind a chart to real research stats, or start from sample data — with a live preview before inserting.
            </p>
          </div>
        )}

        {tab === "images" && (
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2.5 text-[12px] font-medium text-tear-bg bg-tear-primary rounded-md hover:bg-tear-primary-dark transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            <p className="text-[11px] text-tear-muted leading-relaxed">
              Background removal isn&apos;t available yet — images insert as-is.
            </p>
          </div>
        )}

        {tab === "icons" && (
          <div className="grid grid-cols-5 gap-1.5">
            {ICON_LIBRARY.map((name) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const Icon = (LucideIcons as any)[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  title={name}
                  onClick={() => {
                    const src = iconToDataUri(Icon, theme.palette.primary, 64);
                    onInsertElement(newImageElement(src, 64, 64, nextZIndex));
                  }}
                  className="flex items-center justify-center aspect-square rounded-md border border-tear-border bg-white hover:border-tear-primary hover:bg-[#FBF4EE] transition-colors text-tear-muted"
                >
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {chartModalOpen && (
        <ChartInsertModal
          researchDoc={researchDoc}
          onClose={() => setChartModalOpen(false)}
          onInsert={(chartType, labels, values, seriesName, sourceStatId) =>
            onInsertElement(newChartElement(chartType, labels, values, seriesName, sourceStatId, nextZIndex))
          }
        />
      )}
    </div>
  );
}
