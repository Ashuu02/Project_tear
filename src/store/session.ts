import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateSessionId } from "@/lib/utils";
import type { ResearchDoc, DeckData } from "@/types/teardown";

type AgentStatus = "idle" | "running" | "done" | "error";

interface Tier1Answers {
  dimensions: string[];
  goal: string;
  depth: string;
}

interface SessionState {
  sessionId: string;
  productName: string;
  tier1Answers: Tier1Answers | null;
  agentStatuses: Record<string, AgentStatus>;
  researchDoc: ResearchDoc | null;
  deckData: DeckData | null;
  setProductName: (name: string) => void;
  setTier1Answers: (answers: Tier1Answers) => void;
  setAgentStatus: (agent: string, status: AgentStatus) => void;
  setResearchDoc: (doc: ResearchDoc) => void;
  setDeckData: (deck: DeckData) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: generateSessionId(),
      productName: "",
      tier1Answers: null,
      agentStatuses: {},
      researchDoc: null,
      deckData: null,
      setProductName: (name) => set({ productName: name }),
      setTier1Answers: (answers) => set({ tier1Answers: answers }),
      setAgentStatus: (agent, status) =>
        set((s) => ({ agentStatuses: { ...s.agentStatuses, [agent]: status } })),
      setResearchDoc: (doc) => set({ researchDoc: doc }),
      setDeckData: (deck) => set({ deckData: deck }),
      resetSession: () =>
        set({
          sessionId: generateSessionId(),
          productName: "",
          tier1Answers: null,
          agentStatuses: {},
          researchDoc: null,
          deckData: null,
        }),
    }),
    { name: "tear-session" }
  )
);
