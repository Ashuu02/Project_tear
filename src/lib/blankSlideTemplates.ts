import type { DeckSlide } from "@/types/teardown";

const TEMPLATE_LABELS: Record<DeckSlide["type"], string> = {
  cover: "Cover", bullets: "Bullets", features: "Features", pricing: "Pricing",
  gtm: "GTM Timeline", techstack: "Tech Stack", competitive: "Competitive Table",
  stats: "Stat Cards", funding: "Funding", sources: "Sources",
};

export const TEMPLATE_TYPES = Object.keys(TEMPLATE_LABELS) as DeckSlide["type"][];

export function templateLabel(type: DeckSlide["type"]): string {
  return TEMPLATE_LABELS[type];
}

export function getBlankSlide(type: DeckSlide["type"], productName: string): DeckSlide {
  switch (type) {
    case "cover":
      return { type, title: productName, subtitle: "New slide" };
    case "bullets":
      return {
        type, sectionNum: "•", title: "New section",
        bullets: [{ text: "Key point", sub: "Supporting detail" }, { text: "Key point", sub: "Supporting detail" }],
      };
    case "features":
      return {
        type, sectionNum: "•", title: "Features",
        items: [{ name: "Feature", desc: "Description" }, { name: "Feature", desc: "Description" }, { name: "Feature", desc: "Description" }],
      };
    case "pricing":
      return {
        type, sectionNum: "•", title: "Pricing",
        tiers: [{ name: "Tier", price: "$0", target: "Segment" }, { name: "Tier", price: "$X", target: "Segment", highlight: true }],
      };
    case "gtm":
      return {
        type, sectionNum: "•", title: "Go-to-market",
        phases: [{ label: "Phase 1", desc: "Description" }, { label: "Phase 2", desc: "Description" }],
      };
    case "techstack":
      return { type, sectionNum: "•", title: "Technical Architecture", layers: [{ layer: "Frontend", detail: "Technology" }] };
    case "competitive":
      return {
        type, sectionNum: "•", title: "Market & Competition",
        competitors: [{ name: "Competitor", angle: "Angle", threat: "Medium" }],
      };
    case "stats":
      return { type, sectionNum: "•", title: "Key Stats", stats: [{ label: "Metric", value: "Value" }, { label: "Metric", value: "Value" }] };
    case "funding":
      return { type, sectionNum: "•", title: "Financials & Funding", rounds: [{ round: "Seed", year: "2024", amount: "$X", lead: "Investor" }] };
    case "sources":
      return { type, title: "Sources & Appendix", sources: ["[1] Source — domain.com"] };
  }
}
