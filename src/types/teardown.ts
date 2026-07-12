export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

export interface ChartPoint {
  label: string;
  value: number;
  color?: string;
}

export interface ChartData {
  id: string;
  type: "bar" | "pie" | "line" | "donut";
  title: string;
  xAxis?: string;
  yAxis?: string;
  unit?: string;
  data: ChartPoint[];
}

export interface ResearchSection {
  id: string;
  title: string;
  content: string;
  keyInsight?: string;
  stats?: Array<{ label: string; value: string; sub?: string; change?: string }>;
  bullets?: string[];
  tables?: TableData[];
  chartData?: ChartData[];
  // Which of ResearchDoc.sources actually back this section's claims — drives real per-section
  // citation rendering instead of guessing from the section's position in the array.
  sourceNums?: number[];
  // Populated by the post-generation hallucination-check pass (src/lib/hallucinationCheck.ts).
  confidence?: "high" | "medium" | "low";
  flags?: string[];
}

export interface TeardownSource {
  num: number;
  domain: string;
  title: string;
  url: string;
  usedIn: string;
}

export interface ResearchDoc {
  sections: ResearchSection[];
  sources: TeardownSource[];
}

export interface DeckSlide {
  type: "cover" | "bullets" | "features" | "pricing" | "gtm" | "techstack" | "competitive" | "stats" | "funding" | "sources";
  title: string;
  subtitle?: string;
  sectionNum?: string;
  bullets?: Array<{ text: string; sub?: string }>;
  stats?: Array<{ label: string; value: string }>;
  items?: Array<{ name: string; desc: string }>;
  tiers?: Array<{ name: string; price: string; target: string; highlight?: boolean }>;
  revenueStats?: Array<{ label: string; value: string; sub?: string }>;
  phases?: Array<{ label: string; desc: string; metric?: string }>;
  layers?: Array<{ layer: string; detail: string }>;
  competitors?: Array<{ name: string; angle: string; threat: string }>;
  tam?: string;
  cagr?: string;
  insight?: string;
  rounds?: Array<{ round: string; year: string; amount: string; lead: string }>;
  totalRaised?: string;
  valuation?: string;
  arr?: string;
  sources?: string[];
}

export interface DeckData {
  slides: DeckSlide[];
}

// ── Phase 2: Canva-style canvas editor ─────────────────────────────────────

export type CanvasElement =
  | {
      id: string; type: "text"; x: number; y: number; w: number; h: number; rotation: number;
      text: string; fontFamily: string; fontSize: number; fontWeight: number; color: string;
      align: "left" | "center" | "right"; lineHeight: number; italic?: boolean; zIndex: number;
      groupId?: string; locked?: boolean; hidden?: boolean;
    }
  | {
      id: string; type: "shape"; x: number; y: number; w: number; h: number; rotation: number;
      shape: "rect" | "ellipse" | "line" | "arrow"; fill: string; stroke?: string; strokeWidth?: number;
      cornerRadius?: number; opacity: number; zIndex: number;
      groupId?: string; locked?: boolean; hidden?: boolean;
    }
  | {
      id: string; type: "image"; x: number; y: number; w: number; h: number; rotation: number;
      src: string; cropX?: number; cropY?: number; cropW?: number; cropH?: number; zIndex: number;
      groupId?: string; locked?: boolean; hidden?: boolean;
    }
  | {
      id: string; type: "chart"; x: number; y: number; w: number; h: number; rotation: number;
      chartType: "bar" | "line" | "pie" | "doughnut" | "area" | "radar" | "scatter";
      title?: string;
      data: { name: string; labels: string[]; values: number[] }[];
      sourceStatId?: string; zIndex: number;
      groupId?: string; locked?: boolean; hidden?: boolean;
    }
  | {
      id: string; type: "table"; x: number; y: number; w: number; h: number; rotation: number;
      rows: string[][]; zIndex: number;
      groupId?: string; locked?: boolean; hidden?: boolean;
    };

export interface CanvasSlide {
  id: string;
  background: { type: "solid" | "gradient" | "image"; value: string };
  elements: CanvasElement[];
  sourceSlideType: DeckSlide["type"];
}

export interface DeckTheme {
  key: string;
  name: string;
  palette: { primary: string; secondary: string; accent: string; background: string; text: string; border: string; surface: string };
  fontHeading: string;
  fontBody: string;
}
