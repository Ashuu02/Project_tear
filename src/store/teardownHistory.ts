import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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

// Full researchDoc/deckData per entry (citations, slide content) makes this grow fast —
// unbounded growth silently blows the ~5MB localStorage quota and breaks every future
// write to this store (including from deck-config's "Generate my deck").
const MAX_ENTRIES = 15;

// The Storage interface's setItem throws QuotaExceededError synchronously, which — because
// zustand's persist middleware writes on the same tick as `set()` — propagates straight back
// out of the store action that triggered it (e.g. updateHistoryEntry in deck-config), aborting
// whatever ran after it. Strip heavy fields off older entries and retry so a full quota never
// takes down an unrelated caller.
function quotaSafeStorage() {
  const base = typeof window !== "undefined" ? window.localStorage : undefined;
  return createJSONStorage(() => ({
    getItem: (name) => base?.getItem(name) ?? null,
    removeItem: (name) => base?.removeItem(name),
    setItem: (name, value) => {
      if (!base) return;
      try {
        base.setItem(name, value);
        return;
      } catch {
        // fall through to recovery below
      }
      try {
        const parsed = JSON.parse(value) as { state: TeardownHistoryState; version: number };
        const entries = parsed.state.entries ?? [];
        // Keep full researchDoc/deckData only for the 3 most recent entries; strip the rest.
        const trimmed = entries.map((e, i) =>
          i < 3 ? e : { ...e, researchDoc: undefined, deckData: undefined }
        );
        base.setItem(name, JSON.stringify({ ...parsed, state: { ...parsed.state, entries: trimmed } }));
      } catch {
        // Still over quota (or storage unavailable) — drop silently rather than crash the caller.
      }
    },
  }));
}

export const useTeardownHistory = create<TeardownHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({
          entries: (s.entries.some((e) => e.sessionId === entry.sessionId)
            ? s.entries.map((e) => (e.sessionId === entry.sessionId ? entry : e))
            : [entry, ...s.entries]
          ).slice(0, MAX_ENTRIES),
        })),
      updateEntry: (sessionId, patch) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.sessionId === sessionId ? { ...e, ...patch } : e
          ),
        })),
    }),
    { name: "tear-history", storage: quotaSafeStorage() }
  )
);
