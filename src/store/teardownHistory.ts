import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ResearchDoc, DeckData } from "@/types/teardown";

export type TeardownStatus = "complete" | "in-progress" | "draft";

export interface TeardownHistoryEntry {
  sessionId: string;
  productName: string;
  category: string;
  status: TeardownStatus;
  description: string;
  sourcesCount: number;
  totalSources?: number;
  createdAt: string;
  stepSaved?: number;
  researchDoc?: ResearchDoc;
  deckData?: DeckData;
}

const PRODUCT_CATEGORIES: Record<string, string> = {
  Notion: "Productivity", Obsidian: "Note-taking", Coda: "Productivity", Roam: "Note-taking",
  Figma: "Design tools", Sketch: "Design tools", Framer: "Design tools", Canva: "Design tools",
  Linear: "Dev tools", GitHub: "Dev tools", Vercel: "Dev tools", Jira: "Dev tools",
  Shopify: "E-commerce", Stripe: "Payments", Klaviyo: "Marketing",
  Slack: "Communication", Discord: "Communication", Zoom: "Communication", Loom: "Communication",
  ChatGPT: "AI tools", Claude: "AI tools", Midjourney: "AI tools", Cursor: "AI tools",
  Superhuman: "Email", Asana: "Project management", Monday: "Project management", ClickUp: "Project management",
};

export function getProductCategory(productName: string): string {
  const key = Object.keys(PRODUCT_CATEGORIES).find(
    (k) => k.toLowerCase() === productName.toLowerCase()
  );
  return key ? PRODUCT_CATEGORIES[key] : "";
}

interface TeardownHistoryState {
  entries: TeardownHistoryEntry[];
  addEntry: (entry: TeardownHistoryEntry) => void;
  updateEntry: (sessionId: string, patch: Partial<TeardownHistoryEntry>) => void;
}

export const useTeardownHistory = create<TeardownHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({
          entries: s.entries.some((e) => e.sessionId === entry.sessionId)
            ? s.entries.map((e) => (e.sessionId === entry.sessionId ? entry : e))
            : [entry, ...s.entries],
        })),
      updateEntry: (sessionId, patch) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.sessionId === sessionId ? { ...e, ...patch } : e
          ),
        })),
    }),
    { name: "tear-history" }
  )
);
