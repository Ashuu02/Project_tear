import type { CanvasElement, CanvasSlide, DeckTheme } from "@/types/teardown";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";

function newId(): string {
  return crypto.randomUUID();
}

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length !== 6) return 1;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// New elements drop at the slide's visual center, so their default color needs to contrast
// with whatever is actually behind that point — not just the theme's nominal background.
// Slide types like "cover" paint a full-bleed dark shape over the theme background, so we
// look for the topmost full-slide-covering shape first and fall back to the theme otherwise.
export function pickContrastingTextColor(slide: CanvasSlide | undefined, theme: DeckTheme): string {
  const fullBleedShapes = (slide?.elements ?? [])
    .filter((el): el is Extract<CanvasElement, { type: "shape" }> =>
      el.type === "shape" && el.x <= 5 && el.y <= 5 && el.w >= SLIDE_WIDTH * 0.9 && el.h >= SLIDE_HEIGHT * 0.9
    )
    .sort((a, b) => b.zIndex - a.zIndex);
  const backgroundColor = fullBleedShapes[0]?.fill
    ?? (slide?.background.type === "solid" ? slide.background.value : theme.palette.background);
  return luminance(backgroundColor) > 0.55 ? theme.palette.text : "#FFFFFF";
}

export type TextPreset = "heading" | "subheading" | "body" | "bullet";

const TEXT_PRESETS: Record<TextPreset, { text: string; fontSize: number; fontWeight: number; w: number; h: number }> = {
  heading:    { text: "Heading",       fontSize: 32, fontWeight: 700, w: 500, h: 60 },
  subheading: { text: "Subheading",    fontSize: 20, fontWeight: 700, w: 450, h: 40 },
  body:       { text: "Body text",     fontSize: 14, fontWeight: 400, w: 400, h: 60 },
  bullet:     { text: "• Bullet point", fontSize: 14, fontWeight: 400, w: 350, h: 30 },
};

export function newTextElement(preset: TextPreset, theme: DeckTheme, zIndex: number, slide?: CanvasSlide): CanvasElement {
  const p = TEXT_PRESETS[preset];
  return {
    id: newId(), type: "text", zIndex, rotation: 0,
    x: (SLIDE_WIDTH - p.w) / 2, y: (SLIDE_HEIGHT - p.h) / 2, w: p.w, h: p.h,
    text: p.text,
    fontFamily: preset === "body" || preset === "bullet" ? theme.fontBody : theme.fontHeading,
    fontSize: p.fontSize, fontWeight: p.fontWeight, color: pickContrastingTextColor(slide, theme),
    align: "left", lineHeight: 1.3,
  };
}

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export function newShapeElement(shape: ShapeKind, theme: DeckTheme, zIndex: number): CanvasElement {
  const size = shape === "line" || shape === "arrow" ? { w: 200, h: 4 } : { w: 160, h: 120 };
  return {
    id: newId(), type: "shape", zIndex, rotation: 0,
    x: (SLIDE_WIDTH - size.w) / 2, y: (SLIDE_HEIGHT - size.h) / 2, w: size.w, h: size.h,
    shape,
    fill: theme.palette.primary,
    stroke: shape === "line" || shape === "arrow" ? theme.palette.primary : undefined,
    strokeWidth: shape === "line" || shape === "arrow" ? 3 : undefined,
    cornerRadius: shape === "rect" ? 4 : undefined,
    opacity: 1,
  };
}

export function newImageElement(src: string, w: number, h: number, zIndex: number): CanvasElement {
  const scale = Math.min(1, 400 / w, 300 / h);
  const scaledW = w * scale;
  const scaledH = h * scale;
  return {
    id: newId(), type: "image", zIndex, rotation: 0,
    x: (SLIDE_WIDTH - scaledW) / 2, y: (SLIDE_HEIGHT - scaledH) / 2, w: scaledW, h: scaledH,
    src,
  };
}

export function newChartElement(
  chartType: Extract<CanvasElement, { type: "chart" }>["chartType"],
  labels: string[],
  values: number[],
  seriesName: string,
  sourceStatId: string | undefined,
  zIndex: number,
): CanvasElement {
  const w = 400, h = 280;
  return {
    id: newId(), type: "chart", zIndex, rotation: 0,
    x: (SLIDE_WIDTH - w) / 2, y: (SLIDE_HEIGHT - h) / 2, w, h,
    chartType,
    title: seriesName,
    data: [{ name: seriesName, labels, values }],
    sourceStatId,
  };
}
