export interface ResearchSection {
  id: string;
  title: string;
  content: string;
  keyInsight?: string;
  stats?: Array<{ label: string; value: string; sub?: string }>;
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
