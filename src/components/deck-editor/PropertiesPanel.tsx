"use client";

import { useEffect, useRef } from "react";
import ColorSwatchPicker from "@/components/deck-editor/ColorSwatchPicker";
import { DECK_THEMES } from "@/lib/deckThemes";
import type { CanvasElement, CanvasSlide, DeckTheme } from "@/types/teardown";

// Loosened on purpose: the panel only ever applies a patch when the selection is
// homogeneous (single concrete element type), so the fields are always valid for the
// elements they're applied to — a fully-typed union-narrowed signature here would just
// add ceremony without catching real bugs in an editor-internal API like this.
export type ElementPropsPatch = Record<string, unknown>;

interface PropertiesPanelProps {
  slide: CanvasSlide;
  selectedIds: Set<string>;
  onUpdateElements: (ids: string[], patch: ElementPropsPatch) => void;
  onReorder: (ids: string[], action: "front" | "back" | "forward" | "backward") => void;
  onToggleLock: (ids: string[]) => void;
  onToggleHidden: (ids: string[]) => void;
  onDeleteElements: (ids: string[]) => void;
  onChangeBackground: (bg: CanvasSlide["background"]) => void;
  onImproveSlide?: () => void;
  improveSlideBusy?: boolean;
  activeTheme: DeckTheme;
  onApplyTheme: (theme: DeckTheme) => void;
  /** "panel" (default) is the desktop 272px column with its own side border. "sheet" is for
   *  embedding inside a <1024px MobileSheet — full width, no side border. */
  variant?: "panel" | "sheet";
}

const FONT_OPTIONS = Array.from(new Set(DECK_THEMES.flatMap((t) => [t.fontHeading, t.fontBody]))).sort();

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-5 border-b border-tear-border flex flex-col gap-3.5">
      <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">{title}</span>
      {children}
    </div>
  );
}

function NumberField({ label, value, onCommit, step = 1 }: { label: string; value: number; onCommit: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-1 flex-1 min-w-0">
      <span className="text-[10px] text-tear-muted">{label}</span>
      <input
        type="number"
        step={step}
        defaultValue={Math.round(value * 100) / 100}
        key={value}
        onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onCommit(v); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="w-full px-2 py-1 text-[11px] font-mono bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
      />
    </label>
  );
}

function ButtonToggleGroup<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-md overflow-hidden border border-tear-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors ${
            value === opt.value ? "bg-tear-primary text-white" : "bg-white text-tear-muted hover:bg-[#F0E8DF]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function PropertiesPanel({
  slide, selectedIds, onUpdateElements, onReorder, onToggleLock, onToggleHidden, onDeleteElements, onChangeBackground,
  onImproveSlide, improveSlideBusy, activeTheme, onApplyTheme, variant = "panel",
}: PropertiesPanelProps) {
  const selectedElements = slide.elements.filter((e) => selectedIds.has(e.id));
  const ids = selectedElements.map((e) => e.id);
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const homogeneousType = selectedElements.length > 0 && selectedElements.every((e) => e.type === selectedElements[0].type)
    ? selectedElements[0].type
    : null;

  // Background/AI/Theme stay mounted across selection changes now (they used to live in a
  // fully separate render branch that remounted on every selection change, which reset scroll
  // position for free) — reset it explicitly so a scrolled-down properties view doesn't look
  // blank right after deselecting.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [single?.id, selectedElements.length]);

  return (
    <div ref={scrollRef} className={variant === "sheet" ? "w-full overflow-y-auto" : "w-[272px] flex-shrink-0 bg-tear-panel border-l border-tear-border overflow-y-auto"}>
      <Section title="Slide Background">
        <ButtonToggleGroup
          options={[{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }, { value: "image", label: "Image" }]}
          value={slide.background.type}
          onChange={(type) => onChangeBackground({ type, value: slide.background.value })}
        />
        {slide.background.type === "solid" && (
          <ColorSwatchPicker
            label="Color"
            color={slide.background.value}
            onChange={(color) => onChangeBackground({ type: "solid", value: color })}
          />
        )}
        {slide.background.type === "gradient" && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-tear-muted">CSS gradient</span>
            <input
              defaultValue={slide.background.value}
              onBlur={(e) => onChangeBackground({ type: "gradient", value: e.target.value })}
              placeholder="linear-gradient(135deg,#C2451E,#F5EFE4)"
              className="w-full px-2 py-1 text-[11px] font-mono bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
            />
          </label>
        )}
        {slide.background.type === "image" && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-tear-muted">Image URL</span>
            <input
              defaultValue={slide.background.value}
              onBlur={(e) => onChangeBackground({ type: "image", value: e.target.value })}
              placeholder="https://…"
              className="w-full px-2 py-1 text-[11px] font-mono bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
            />
          </label>
        )}
      </Section>

      <Section title="Theme">
        <div className="flex flex-col gap-1">
          {DECK_THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => onApplyTheme(t)}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                t.key === activeTheme.key ? "bg-[#FFF7ED] border border-[#F0C9B8]" : "border border-transparent hover:bg-[#F0E8DF]"
              }`}
            >
              <span className="w-5 h-5 rounded-full border border-tear-border flex-shrink-0 overflow-hidden" style={{ background: t.palette.background }}>
                <span className="block w-full h-full" style={{ background: `linear-gradient(135deg, ${t.palette.primary} 50%, transparent 50%)` }} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className={`text-[12px] truncate ${t.key === activeTheme.key ? "text-tear-primary font-medium" : "text-tear-text"}`}>{t.name}</span>
                <span className="text-[10px] text-tear-muted truncate">{t.fontHeading}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      {onImproveSlide && (
        <Section title="AI">
          <button
            onClick={onImproveSlide}
            disabled={improveSlideBusy}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-tear-primary bg-transparent text-tear-primary font-dm-sans text-[13.5px] font-medium transition-colors hover:bg-[#FFF7ED] hover:border-tear-primary-dark hover:text-tear-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.8 L9.3 5.6 L13.1 6.9 L9.3 8.2 L8 12 L6.7 8.2 L2.9 6.9 L6.7 5.6 Z" fill="currentColor" />
              <path d="M12.6 10.4 L13.2 12 L14.8 12.6 L13.2 13.2 L12.6 14.8 L12 13.2 L10.4 12.6 L12 12 Z" fill="currentColor" />
            </svg>
            {improveSlideBusy ? "Improving…" : "Improve this slide"}
          </button>
          <p className="text-[13px] text-tear-muted leading-relaxed">Tightens the copy on this slide&apos;s text. Positions, styling, and charts are untouched.</p>
        </Section>
      )}

      {selectedElements.length === 0 && (
        <div className="px-5 py-6 text-[13px] text-[#A89890] leading-relaxed">
          Select an element to edit it. With nothing selected, you&apos;re editing the slide background.
        </div>
      )}

      {single && (
        <Section title="Position & Size">
          <div className="flex gap-2">
            <NumberField label="X" value={single.x} onCommit={(v) => onUpdateElements([single.id], { x: v })} />
            <NumberField label="Y" value={single.y} onCommit={(v) => onUpdateElements([single.id], { y: v })} />
          </div>
          <div className="flex gap-2">
            <NumberField label="W" value={single.w} onCommit={(v) => onUpdateElements([single.id], { w: Math.max(10, v) })} />
            <NumberField label="H" value={single.h} onCommit={(v) => onUpdateElements([single.id], { h: Math.max(10, v) })} />
          </div>
          <NumberField label="Rotation °" value={single.rotation} onCommit={(v) => onUpdateElements([single.id], { rotation: v })} />
        </Section>
      )}

      {homogeneousType === "text" && (
        <Section title={`Text${ids.length > 1 ? ` (${ids.length})` : ""}`}>
          {(() => {
            const t = selectedElements[0] as Extract<CanvasElement, { type: "text" }>;
            return (
              <>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tear-muted">Font</span>
                  <select
                    value={t.fontFamily}
                    onChange={(e) => onUpdateElements(ids, { fontFamily: e.target.value })}
                    className="w-full px-2 py-1.5 text-[11px] bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
                  >
                    {!FONT_OPTIONS.includes(t.fontFamily) && <option value={t.fontFamily}>{t.fontFamily}</option>}
                    {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <div className="flex gap-2">
                  <NumberField label="Size" value={t.fontSize} onCommit={(v) => onUpdateElements(ids, { fontSize: Math.max(6, v) })} />
                  <NumberField label="Line height" value={t.lineHeight} step={0.1} onCommit={(v) => onUpdateElements(ids, { lineHeight: v })} />
                </div>
                <ButtonToggleGroup
                  options={[{ value: "400", label: "Regular" }, { value: "700", label: "Bold" }]}
                  value={String(t.fontWeight >= 700 ? 700 : 400)}
                  onChange={(v) => onUpdateElements(ids, { fontWeight: Number(v) })}
                />
                <ButtonToggleGroup
                  options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
                  value={t.align}
                  onChange={(v) => onUpdateElements(ids, { align: v })}
                />
                <button
                  onClick={() => onUpdateElements(ids, { italic: !t.italic })}
                  className={`px-2 py-1.5 text-[11px] font-medium rounded-md border transition-colors ${
                    t.italic ? "bg-tear-primary text-white border-tear-primary" : "bg-white text-tear-muted border-tear-border hover:bg-[#F0E8DF]"
                  }`}
                >
                  Italic
                </button>
                <ColorSwatchPicker label="Color" color={t.color} onChange={(color) => onUpdateElements(ids, { color })} />
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tear-muted">Text content</span>
                  <textarea
                    defaultValue={t.text}
                    key={t.id + t.text}
                    onBlur={(e) => onUpdateElements(ids, { text: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 text-[11px] bg-white border border-tear-border rounded text-tear-text resize-none focus:outline-none focus:border-tear-primary"
                  />
                </label>
              </>
            );
          })()}
        </Section>
      )}

      {homogeneousType === "shape" && (
        <Section title={`Shape${ids.length > 1 ? ` (${ids.length})` : ""}`}>
          {(() => {
            const s = selectedElements[0] as Extract<CanvasElement, { type: "shape" }>;
            return (
              <>
                <ColorSwatchPicker label="Fill" color={s.fill} onChange={(fill) => onUpdateElements(ids, { fill })} />
                <ColorSwatchPicker label="Stroke" color={s.stroke ?? "#000000"} onChange={(stroke) => onUpdateElements(ids, { stroke })} />
                <NumberField label="Stroke width" value={s.strokeWidth ?? 0} onCommit={(v) => onUpdateElements(ids, { strokeWidth: Math.max(0, v) })} />
                {s.shape === "rect" && (
                  <NumberField label="Corner radius" value={s.cornerRadius ?? 0} onCommit={(v) => onUpdateElements(ids, { cornerRadius: Math.max(0, v) })} />
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-tear-muted">Opacity ({Math.round(s.opacity * 100)}%)</span>
                  <input
                    type="range" min={0} max={1} step={0.05} defaultValue={s.opacity} key={s.id + s.opacity}
                    onChange={(e) => onUpdateElements(ids, { opacity: parseFloat(e.target.value) })}
                    className="w-full accent-tear-primary"
                  />
                </label>
              </>
            );
          })()}
        </Section>
      )}

      {homogeneousType === "chart" && single && (
        <Section title="Chart">
          {(() => {
            const c = single as Extract<CanvasElement, { type: "chart" }>;
            const series = c.data[0] ?? { name: "Value", labels: [], values: [] };
            function updateRow(i: number, field: "label" | "value", val: string) {
              const labels = [...series.labels];
              const values = [...series.values];
              if (field === "label") labels[i] = val; else values[i] = parseFloat(val) || 0;
              onUpdateElements([c.id], { data: [{ ...series, labels, values }] });
            }
            function addRow() {
              onUpdateElements([c.id], { data: [{ ...series, labels: [...series.labels, "New"], values: [...series.values, 0] }] });
            }
            function removeRow(i: number) {
              onUpdateElements([c.id], {
                data: [{ ...series, labels: series.labels.filter((_, idx) => idx !== i), values: series.values.filter((_, idx) => idx !== i) }],
              });
            }
            return (
              <>
                <select
                  value={c.chartType}
                  onChange={(e) => onUpdateElements([c.id], { chartType: e.target.value })}
                  className="w-full px-2 py-1.5 text-[11px] bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
                >
                  {["bar", "line", "area", "pie", "doughnut", "radar", "scatter"].map((t) => (
                    <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-tear-muted">Data</span>
                  {series.labels.map((label, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <input
                        defaultValue={label}
                        onBlur={(e) => updateRow(i, "label", e.target.value)}
                        className="flex-1 min-w-0 px-1.5 py-1 text-[11px] bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
                      />
                      <input
                        type="number"
                        defaultValue={series.values[i]}
                        onBlur={(e) => updateRow(i, "value", e.target.value)}
                        className="w-16 px-1.5 py-1 text-[11px] font-mono bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
                      />
                      <button onClick={() => removeRow(i)} className="text-tear-chip hover:text-tear-muted px-1">×</button>
                    </div>
                  ))}
                  <button onClick={addRow} className="text-[11px] text-tear-primary hover:underline self-start mt-1">+ Add row</button>
                </div>
              </>
            );
          })()}
        </Section>
      )}

      {homogeneousType === "table" && single && (
        <Section title="Table">
          {(() => {
            const tbl = single as Extract<CanvasElement, { type: "table" }>;
            function updateCell(r: number, cidx: number, val: string) {
              const rows = tbl.rows.map((row) => [...row]);
              rows[r][cidx] = val;
              onUpdateElements([tbl.id], { rows });
            }
            return (
              <div className="flex flex-col gap-1">
                {tbl.rows.map((row, r) => (
                  <div key={r} className="flex gap-1">
                    {row.map((cell, cidx) => (
                      <input
                        key={cidx}
                        defaultValue={cell}
                        onBlur={(e) => updateCell(r, cidx, e.target.value)}
                        className="flex-1 min-w-0 px-1.5 py-1 text-[10px] bg-white border border-tear-border rounded text-tear-text focus:outline-none focus:border-tear-primary"
                      />
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </Section>
      )}

      {!homogeneousType && selectedElements.length > 1 && (
        <Section title={`${selectedElements.length} elements selected`}>
          <p className="text-[11px] text-tear-muted leading-relaxed">Mixed element types — use layer controls below, or select elements of the same type to edit shared properties together.</p>
        </Section>
      )}

      {selectedElements.length > 0 && (
        <Section title="Layer">
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => onReorder(ids, "front")} className="px-2 py-1.5 text-[11px] text-tear-muted bg-white border border-tear-border rounded-md hover:bg-[#F0E8DF]">Bring to front</button>
            <button onClick={() => onReorder(ids, "back")} className="px-2 py-1.5 text-[11px] text-tear-muted bg-white border border-tear-border rounded-md hover:bg-[#F0E8DF]">Send to back</button>
            <button onClick={() => onReorder(ids, "forward")} className="px-2 py-1.5 text-[11px] text-tear-muted bg-white border border-tear-border rounded-md hover:bg-[#F0E8DF]">Forward</button>
            <button onClick={() => onReorder(ids, "backward")} className="px-2 py-1.5 text-[11px] text-tear-muted bg-white border border-tear-border rounded-md hover:bg-[#F0E8DF]">Backward</button>
            <button onClick={() => onToggleLock(ids)} className="px-2 py-1.5 text-[11px] text-tear-muted bg-white border border-tear-border rounded-md hover:bg-[#F0E8DF]">
              {selectedElements.every((e) => e.locked) ? "Unlock" : "Lock"}
            </button>
            <button onClick={() => onToggleHidden(ids)} className="px-2 py-1.5 text-[11px] text-tear-muted bg-white border border-tear-border rounded-md hover:bg-[#F0E8DF]">
              {selectedElements.every((e) => e.hidden) ? "Show" : "Hide"}
            </button>
          </div>
          <button
            onClick={() => onDeleteElements(ids)}
            className="px-2 py-1.5 text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
          >
            Delete
          </button>
        </Section>
      )}
    </div>
  );
}
