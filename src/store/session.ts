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

export type Tier2Answers = Record<string, string | string[]>;

export interface UserContext {
  text: string;
  fileName?: string;
}

export interface ActiveSession {
  sessionId: string;
  productName: string;
  stageLabel: string;
  progress: number;
}

interface SessionState {
  sessionId: string;
  productName: string;
  tier1Answers: Tier1Answers | null;
  tier2Answers: Tier2Answers | null;
  userContext: UserContext | null;
  agentStatuses: Record<string, AgentStatus>;
  researchDoc: ResearchDoc | null;
  deckData: DeckData | null;
  activeSession: ActiveSession | null;
  setProductName: (name: string) => void;
  setTier1Answers: (answers: Tier1Answers) => void;
  setTier2Answers: (answers: Tier2Answers) => void;
  setUserContext: (ctx: UserContext | null) => void;
  setAgentStatus: (agent: string, status: AgentStatus) => void;
  setResearchDoc: (doc: ResearchDoc) => void;
  setDeckData: (deck: DeckData) => void;
  setActiveSession: (s: ActiveSession) => void;
  clearActiveSession: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: generateSessionId(),
      productName: "",
      tier1Answers: null,
      tier2Answers: null,
      userContext: null,
      agentStatuses: {},
      researchDoc: null,
      deckData: null,
      activeSession: null,
      setProductName: (name) => set({ productName: name }),
      setTier1Answers: (answers) => set({ tier1Answers: answers }),
      setTier2Answers: (answers) => set({ tier2Answers: answers }),
      setUserContext: (ctx) => set({ userContext: ctx }),
      setAgentStatus: (agent, status) =>
        set((s) => ({ agentStatuses: { ...s.agentStatuses, [agent]: status } })),
      setResearchDoc: (doc) => set({ researchDoc: doc }),
      setDeckData: (deck) => set({ deckData: deck }),
      setActiveSession: (s) => set({ activeSession: s }),
      clearActiveSession: () => set({ activeSession: null }),
      resetSession: () =>
        set({
          sessionId: generateSessionId(),
          productName: "",
          tier1Answers: null,
          tier2Answers: null,
          userContext: null,
          agentStatuses: {},
          researchDoc: null,
          deckData: null,
          activeSession: null,
        }),
    }),
    { name: "tear-session" }
  )
);
