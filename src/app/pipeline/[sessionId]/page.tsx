"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import PipelineNav from "@/components/pipeline/PipelineNav";
import AgentFeed from "@/components/pipeline/AgentFeed";
import TeardownPreview from "@/components/pipeline/TeardownPreview";
import type { FeedItem } from "@/components/pipeline/AgentFeed";
import type { ResearchDoc } from "@/types/teardown";
import { useTeardownHistory, getProductCategory } from "@/store/teardownHistory";

const INITIAL_FEED: FeedItem[] = [
  { id: "q", agent: "Question Agent", message: "Analyzing product…",            status: "queued" },
  { id: "c", agent: "Crawler Agent",  message: "Web research — queued",          status: "queued" },
  { id: "d", agent: "Document Agent", message: "Synthesizing teardown — queued", status: "queued" },
];

export default function PipelinePage() {
  const router         = useRouter();
  const productName    = useSessionStore((s) => s.productName);
  const sessionId      = useSessionStore((s) => s.sessionId);
  const tier1Answers   = useSessionStore((s) => s.tier1Answers);
  const tier2Answers   = useSessionStore((s) => s.tier2Answers);
  const userContext    = useSessionStore((s) => s.userContext);
  const setResearchDoc      = useSessionStore((s) => s.setResearchDoc);
  const setActiveSession    = useSessionStore((s) => s.setActiveSession);
  const clearActiveSession  = useSessionStore((s) => s.clearActiveSession);
  const addEntry = useTeardownHistory((s) => s.addEntry);

  const [ready, setReady]                   = useState(false);
  const [feedItems, setFeedItems]           = useState<FeedItem[]>(INITIAL_FEED);
  const [previewText, setPreviewText]       = useState<string | undefined>();
  const [sourceProgress, setSourceProgress] = useState<{ crawled: number; total: number } | undefined>();
  const [stopped, setStopped]               = useState(false);
  const crawlCountRef = useRef(0);
  const esRef         = useRef<EventSource | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  function updateAgentItem(agentName: string, patch: Partial<FeedItem>) {
    // Only update the main agent row (no url), not crawl sub-items
    setFeedItems((prev) =>
      prev.map((item) => item.agent === agentName && !item.url ? { ...item, ...patch } : item)
    );
  }

  function handleStop() {
    esRef.current?.close();
    esRef.current = null;
    setStopped(true);
    clearActiveSession();
    setFeedItems((prev) =>
      prev.map((item) =>
        item.status === "active" || item.status === "queued"
          ? { ...item, status: "error", message: "Stopped by user" }
          : item
      )
    );
  }

  useEffect(() => {
    if (!ready || !productName) return;

    setActiveSession({ sessionId, productName, stageLabel: "Starting pipeline…", progress: 5, resumePath: `/pipeline/${sessionId}` });

    const params = new URLSearchParams({
      product: productName,
      sessionId,
      tier1: JSON.stringify(tier1Answers ?? {}),
      tier2: JSON.stringify(tier2Answers ?? {}),
    });

    // Pass user context if available
    if (userContext?.text) {
      params.set("userContext", userContext.text);
    }

    const es = new EventSource(`/api/stream/${sessionId}?${params}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        switch (data.type) {
          case "agent": {
            if (data.status === "running") {
              updateAgentItem(data.agent, {
                status: "active",
                message: data.message,
                ...(typeof data.progress === "number" ? { progress: data.progress } : {}),
              });
              const stageMap: Record<string, { stageLabel: string; progress: number }> = {
                "Question Agent": { stageLabel: "Validating product", progress: 15 },
                "Crawler Agent":  { stageLabel: "Gathering web sources", progress: 40 },
                "Document Agent": { stageLabel: "Building research document", progress: 80 },
              };
              const stage = stageMap[data.agent];
              if (stage) setActiveSession({ sessionId, productName, ...stage, resumePath: `/pipeline/${sessionId}` });
            } else if (data.status === "done") {
              updateAgentItem(data.agent, { status: "done", message: data.message, progress: undefined });
            } else if (data.status === "error") {
              updateAgentItem(data.agent, { status: "error", message: data.message ?? "Error", progress: undefined });
            }
            break;
          }
          case "crawl": {
            crawlCountRef.current += 1;
            const crawlId = `crawl-${crawlCountRef.current}`;
            setFeedItems((prev) => {
              const insertAt = prev.findIndex((f) => f.agent === "Document Agent");
              const newItem: FeedItem = {
                id: crawlId,
                agent: "Crawler Agent",
                message: data.message,
                url: data.url,
                findings: data.findings,
                status: "done",
              };
              return insertAt === -1
                ? [...prev, newItem]
                : [...prev.slice(0, insertAt), newItem, ...prev.slice(insertAt)];
            });
            break;
          }
          case "sources": {
            setSourceProgress({ crawled: data.crawled, total: data.total });
            break;
          }
          case "preview": {
            setPreviewText(data.text);
            break;
          }
          case "done": {
            clearActiveSession();
            const doc = data.document as ResearchDoc;
            setResearchDoc(doc);
            addEntry({
              sessionId,
              productName,
              category: getProductCategory(productName),
              status: "complete",
              description: doc?.sections?.[0]?.keyInsight?.slice(0, 130) ?? "",
              sourcesCount: crawlCountRef.current,
              createdAt: new Date().toISOString(),
            });
            es.close();
            router.push(`/research/${sessionId}`);
            break;
          }
          case "error": {
            setFeedItems((prev) =>
              prev.map((item) =>
                item.status === "active" ? { ...item, status: "error", message: data.message } : item
              )
            );
            es.close();
            break;
          }
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [ready, productName, sessionId, tier1Answers, tier2Answers, userContext, setResearchDoc, setActiveSession, clearActiveSession, router]);

  if (!ready || !productName) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <PipelineNav productName={productName} onStop={stopped ? undefined : handleStop} />
      <div className="flex-1 flex overflow-hidden">
        <AgentFeed productName={productName} feedItems={feedItems} />
        <TeardownPreview productName={productName} previewText={previewText} sourceProgress={sourceProgress} />
      </div>
    </div>
  );
}
