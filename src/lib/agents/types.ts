export type ResearchDepthParam = "standard" | "moderate" | "deep";

export interface DepthConfig {
  maxCrawlerTokens: number;
  maxDocTokens: number;
  maxSearches: number;
  estimatedOutChars: number;
  wordRange: string;
  statsCount: string;
  bulletsCount: string;
  extraGuidance: string;
}

export const DEPTH_CONFIGS: Record<ResearchDepthParam, DepthConfig> = {
  standard: {
    maxCrawlerTokens: 1500, maxDocTokens: 5000, maxSearches: 3, estimatedOutChars: 10000,
    wordRange: "35-50", statsCount: "3", bulletsCount: "3", extraGuidance: "",
  },
  moderate: {
    maxCrawlerTokens: 2500, maxDocTokens: 9000, maxSearches: 4, estimatedOutChars: 18000,
    wordRange: "90-130", statsCount: "3-4", bulletsCount: "4-5",
    extraGuidance: "Add more tables/charts where the research supports them.",
  },
  deep: {
    maxCrawlerTokens: 3500, maxDocTokens: 14000, maxSearches: 5, estimatedOutChars: 28000,
    wordRange: "150-200", statsCount: "4-5", bulletsCount: "5-6",
    extraGuidance: "Add more tables/charts, and go deeper on comparisons, numbers, and specifics wherever the research supports it.",
  },
};

export function resolveDepthConfig(raw: string | null): DepthConfig {
  const key: ResearchDepthParam = raw === "moderate" || raw === "deep" ? raw : "standard";
  return DEPTH_CONFIGS[key];
}

export type SendFn = (payload: object) => void;
