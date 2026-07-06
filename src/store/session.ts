import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateSessionId } from "@/lib/utils";
import type { ResearchDoc, DeckData } from "@/types/teardown";
import type { ModelProvider } from "@/lib/providers";

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
  resumePath: string;
}

interface SessionState {
  sessionId: string;
  productName: string;
  selectedModel: ModelProvider;
  tier1Answers: Tier1Answers | null;
  tier2Answers: Tier2Answers | null;
  tier2Step: number;
  tier2AnswersDraft: Tier2Answers;
  userContext: UserContext | null;
  agentStatuses: Record<string, AgentStatus>;
  researchDoc: ResearchDoc | null;
  deckData: DeckData | null;
  activeSession: ActiveSession | null;
  setProductName: (name: string) => void;
  setSelectedModel: (model: ModelProvider) => void;
  setTier1Answers: (answers: Tier1Answers) => void;
  setTier2Answers: (answers: Tier2Answers) => void;
  setTier2Draft: (step: number, answers: Tier2Answers) => void;
  clearTier2Draft: () => void;
  setUserContext: (ctx: UserContext | null) => void;
  setAgentStatus: (agent: string, status: AgentStatus) => void;
  setResearchDoc: (doc: ResearchDoc) => void;
  setDeckData: (deck: DeckData) => void;
  setActiveSession: (s: ActiveSession) => void;
  clearActiveSession: () => void;
  resetSession: () => void;
  startNewTeardown: (productName: string) => void;
  loadFromHistory: (entry: { sessionId: string; productName: string; researchDoc?: ResearchDoc; deckData?: DeckData }) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: generateSessionId(),
      productName: "",
      selectedModel: "claude",
      tier1Answers: null,
      tier2Answers: null,
      tier2Step: 0,
      tier2AnswersDraft: {},
      userContext: null,
      agentStatuses: {},
      researchDoc: null,
      deckData: null,
      activeSession: null,
      setProductName: (name) => set({ productName: name }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setTier1Answers: (answers) => set({ tier1Answers: answers }),
      setTier2Answers: (answers) => set({ tier2Answers: answers }),
      setTier2Draft: (step, answers) => set({ tier2Step: step, tier2AnswersDraft: answers }),
      clearTier2Draft: () => set({ tier2Step: 0, tier2AnswersDraft: {} }),
      setUserContext: (ctx) => set({ userContext: ctx }),
      setAgentStatus: (agent, status) =>
        set((s) => ({ agentStatuses: { ...s.agentStatuses, [agent]: status } })),
      setResearchDoc: (doc) => set({ researchDoc: doc }),
      setDeckData: (deck) => set({ deckData: deck }),
      setActiveSession: (s) => set({ activeSession: s }),
      clearActiveSession: () => set({ activeSession: null }),
      startNewTeardown: (name) =>
        set({
          sessionId: generateSessionId(),
          productName: name,
          tier1Answers: null,
          tier2Answers: null,
          tier2Step: 0,
          tier2AnswersDraft: {},
          userContext: null,
          agentStatuses: {},
          researchDoc: null,
          deckData: null,
          activeSession: null,
        }),
      loadFromHistory: (entry) =>
        set({
          sessionId: entry.sessionId,
          productName: entry.productName,
          researchDoc: entry.researchDoc ?? null,
          deckData: entry.deckData ?? null,
          tier1Answers: null,
          tier2Answers: null,
          tier2Step: 0,
          tier2AnswersDraft: {},
          userContext: null,
          agentStatuses: {},
          activeSession: null,
        }),
      resetSession: () =>
        set({
          sessionId: generateSessionId(),
          productName: "",
          selectedModel: "claude",
          tier1Answers: null,
          tier2Answers: null,
          tier2Step: 0,
          tier2AnswersDraft: {},
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
