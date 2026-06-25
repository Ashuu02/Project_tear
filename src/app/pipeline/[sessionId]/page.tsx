"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import PipelineNav from "@/components/pipeline/PipelineNav";
import AgentFeed from "@/components/pipeline/AgentFeed";
import TeardownPreview from "@/components/pipeline/TeardownPreview";

export default function PipelinePage() {
  const router      = useRouter();
  const productName = useSessionStore((s) => s.productName);
  const tier1Answers = useSessionStore((s) => s.tier1Answers);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  if (!ready || !productName) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <PipelineNav productName={productName} />
      <div className="flex-1 flex overflow-hidden">
        <AgentFeed productName={productName} />
        <TeardownPreview productName={productName} />
      </div>
    </div>
  );
}
