"use client";

import { useState, useRef } from "react";
import ChartInsertModal from "@/components/deck-editor/ChartInsertModal";
import { newTextElement, newShapeElement, newImageElement, newChartElement, type TextPreset, type ShapeKind } from "@/lib/newCanvasElement";
import { iconToDataUri, ICON_LIBRARY } from "@/lib/iconToDataUri";
import { getBlankSlide, templateLabel, TEMPLATE_TYPES } from "@/lib/blankSlideTemplates";
import { deckSlideToCanvasSlide } from "@/lib/deckSlideToCanvasSlide";
import * as LucideIcons from "lucide-react";
import type { CanvasElement, CanvasSlide, DeckTheme, ResearchDoc } from "@/types/teardown";

type InsertTab = "templates" | "text" | "shapes" | "charts" | "images" | "icons";

interface InsertPanelProps {
  theme: DeckTheme;
  productName: string;
  researchDoc: ResearchDoc | null;
  currentSlide: CanvasSlide | undefined;
  nextZIndex: number;
  onInsertElement: (el: CanvasElement) => void;
  onInsertSlide: (slide: CanvasSlide) => void;
}

const TABS: { key: InsertTab; label: string }[] = [
  { key: "templates", label: "Templates" },
  { key: "text", label: "Text" },
  { key: "shapes", label: "Shapes" },
  { key: "charts", label: "Charts" },
  { key: "images", label: "Images" },
  { key: "icons", label: "Icons" },
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

export default function InsertPanel({ theme, productName, researchDoc, currentSlide, nextZIndex, onInsertElement, onInsertSlide }: InsertPanelProps) {
  const [tab, setTab] = useState<InsertTab>("templates");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="w-[260px] flex-shrink-0 bg-[#221F1D] border-r border-white/10 flex flex-col overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
              tab === t.key ? "bg-tear-primary text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "templates" && (
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onInsertSlide(deckSlideToCanvasSlide(getBlankSlide(type, productName), theme, 0))}
                className="flex flex-col items-center justify-center gap-1.5 aspect-[4/3] rounded-lg border border-white/15 bg-black/20 hover:border-tear-primary hover:bg-white/5 transition-colors p-2"
              >
                <div className="w-full flex-1 rounded border border-white/10" style={{ background: theme.palette.background }} />
                <span className="text-[10px] text-white/60 text-center leading-tight">{templateLabel(type)}</span>
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
                className="px-3 py-2.5 text-left rounded-md border border-white/15 bg-black/20 hover:border-tear-primary hover:bg-white/5 transition-colors"
              >
                <span className={preset === "heading" ? "text-[16px] font-bold text-white" : preset === "subheading" ? "text-[13px] font-bold text-white/80" : "text-[11px] text-white/60"}>
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
                className="flex items-center justify-center aspect-square rounded-lg border border-white/15 bg-black/20 hover:border-tear-primary hover:bg-white/5 transition-colors"
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
              className="px-3 py-2.5 text-[12px] font-medium text-white bg-tear-primary rounded-md hover:opacity-90 transition-opacity"
            >
              + Insert chart
            </button>
            <p className="text-[11px] text-white/40 leading-relaxed">
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
              className="px-3 py-2.5 text-[12px] font-medium text-white bg-tear-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            <p className="text-[11px] text-white/40 leading-relaxed">
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
                  className="flex items-center justify-center aspect-square rounded-md border border-white/15 bg-black/20 hover:border-tear-primary hover:bg-white/5 transition-colors text-white/70"
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
