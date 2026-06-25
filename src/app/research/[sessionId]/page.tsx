"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import ResearchNav from "@/components/research/ResearchNav";
import SectionSidebar from "@/components/research/SectionSidebar";
import DocumentBody from "@/components/research/DocumentBody";
import CitationsPanel from "@/components/research/CitationsPanel";

export default function ResearchPage() {
  const router      = useRouter();
  const productName = useSessionStore((s) => s.productName);
  const sessionId   = useSessionStore((s) => s.sessionId);
  const researchDoc = useSessionStore((s) => s.researchDoc);
  const [ready, setReady]                 = useState(false);
  const [activeSection, setActiveSection] = useState("exec_summary");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  // Default active section to first section id when doc loads
  useEffect(() => {
    if (researchDoc?.sections?.[0]) {
      setActiveSection(researchDoc.sections[0].id);
    }
  }, [researchDoc]);

  if (!ready || !productName) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <ResearchNav productName={productName} sessionId={sessionId} />
      <div className="flex-1 flex overflow-hidden">
        <SectionSidebar
          activeSection={activeSection}
          onSectionClick={setActiveSection}
          sections={researchDoc?.sections}
        />
        <DocumentBody
          productName={productName}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <CitationsPanel sources={researchDoc?.sources} />
      </div>
    </div>
  );
}
