import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateSessionId } from "@/lib/utils";

type AgentStatus = "idle" | "running" | "done" | "error";

interface SessionState {
  sessionId: string;
  productName: string;
  agentStatuses: Record<string, AgentStatus>;
  setProductName: (name: string) => void;
  setAgentStatus: (agent: string, status: AgentStatus) => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: generateSessionId(),
      productName: "",
      agentStatuses: {},
      setProductName: (name) => set({ productName: name }),
      setAgentStatus: (agent, status) =>
        set((s) => ({ agentStatuses: { ...s.agentStatuses, [agent]: status } })),
      resetSession: () =>
        set({ sessionId: generateSessionId(), productName: "", agentStatuses: {} }),
    }),
    { name: "tear-session" }
  )
);
