import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ResearchDoc, DeckData } from "@/types/teardown";

export { getProductCategory } from "@/lib/productCategory";

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
