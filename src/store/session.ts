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

interface SessionState {
  sessionId: string;
  productName: string;
  selectedModel: ModelProvider;
  tier1Answers: Tier1Answers | null;
  tier2Answers: Tier2Answers | null;
  userContext: UserContext | null;
  agentStatuses: Record<string, AgentStatus>;
  researchDoc: ResearchDoc | null;
  deckData: DeckData | null;
  setProductName: (name: string) => void;
  setSelectedModel: (model: ModelProvider) => void;
  setTier1Answers: (answers: Tier1Answers) => void;
  setTier2Answers: (answers: Tier2Answers) => void;
  setUserContext: (ctx: UserContext | null) => void;
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
      selectedModel: "claude",
      tier1Answers: null,
      tier2Answers: null,
      userContext: null,
      agentStatuses: {},
      researchDoc: null,
      deckData: null,
      setProductName: (name) => set({ productName: name }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setTier1Answers: (answers) => set({ tier1Answers: answers }),
      setTier2Answers: (answers) => set({ tier2Answers: answers }),
      setUserContext: (ctx) => set({ userContext: ctx }),
      setAgentStatus: (agent, status) =>
        set((s) => ({ agentStatuses: { ...s.agentStatuses, [agent]: status } })),
      setResearchDoc: (doc) => set({ researchDoc: doc }),
      setDeckData: (deck) => set({ deckData: deck }),
      resetSession: () =>
        set({
          sessionId: generateSessionId(),
          productName: "",
          selectedModel: "claude",
          tier1Answers: null,
          tier2Answers: null,
          userContext: null,
          agentStatuses: {},
          researchDoc: null,
          deckData: null,
        }),
    }),
    { name: "tear-session" }
  )
);
