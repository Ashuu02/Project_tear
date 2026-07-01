"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import ResearchNav from "@/components/research/ResearchNav";
import SectionSidebar from "@/components/research/SectionSidebar";
import DocumentBody from "@/components/research/DocumentBody";
import RightPanel from "@/components/research/RightPanel";
import type { ResearchDoc } from "@/types/teardown";

const MAX_VERSIONS = 5;

export default function ResearchPage() {
  const router              = useRouter();
  const productName         = useSessionStore((s) => s.productName);
  const sessionId           = useSessionStore((s) => s.sessionId);
  const researchDoc         = useSessionStore((s) => s.researchDoc);
  const clearActiveSession  = useSessionStore((s) => s.clearActiveSession);

  const [ready, setReady]                     = useState(false);
  const [activeSection, setActiveSection]     = useState("exec_summary");
  const [tokenCount, setTokenCount]           = useState<number | undefined>();

  // Local copy of researchDoc that chatbot can modify
  const [localResearchDoc, setLocalResearchDoc] = useState<ResearchDoc | null>(null);

  // Per-section content overrides from chatbot edits
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, string>>({});

  // Per-section version history for undo (up to MAX_VERSIONS per section)
  const [sectionVersions, setSectionVersions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    clearActiveSession();
  }, [clearActiveSession]);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  useEffect(() => {
    if (researchDoc?.sections?.[0]) {
      setActiveSection(researchDoc.sections[0].id);
    }
    if (researchDoc) {
      setLocalResearchDoc(researchDoc);
    }
  }, [researchDoc]);

  // Fetch token count on mount
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/tokens/${sessionId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.totalTokens === "number") {
          setTokenCount(data.totalTokens);
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Called by chatbot when a section gets a new version
  const handleSectionUpdate = useCallback((sectionId: string, newContent: string) => {
    setSectionVersions((prev) => {
      const existing = prev[sectionId] ?? [];
      // Push current content to history before updating
      const currentContent = sectionOverrides[sectionId]
        ?? researchDoc?.sections.find(s => s.id === sectionId)?.content
        ?? "";
      const newHistory = [...existing, currentContent].slice(-MAX_VERSIONS);
      return { ...prev, [sectionId]: newHistory };
    });

    setSectionOverrides((prev) => ({ ...prev, [sectionId]: newContent }));

    // Also update localResearchDoc so chatbot gets the latest context
    setLocalResearchDoc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, content: newContent } : s
        ),
      };
    });
  }, [sectionOverrides, researchDoc]);

  // Undo: pop last version from history and restore
  const handleUndoSection = useCallback((sectionId: string) => {
    setSectionVersions((prev) => {
      const history = prev[sectionId] ?? [];
      if (history.length === 0) return prev;
      const lastVersion = history[history.length - 1];
      const newHistory = history.slice(0, -1);

      // Restore the previous content
      setSectionOverrides((prevOverrides) => ({ ...prevOverrides, [sectionId]: lastVersion }));
      setLocalResearchDoc((prevDoc) => {
        if (!prevDoc) return prevDoc;
        return {
          ...prevDoc,
          sections: prevDoc.sections.map((s) =>
            s.id === sectionId ? { ...s, content: lastVersion } : s
          ),
        };
      });

      return { ...prev, [sectionId]: newHistory };
    });
  }, []);

  async function handleDownloadPdf() {
    if (!researchDoc) return;
    const { downloadResearchPdf } = await import("@/lib/downloadPdf");
    await downloadResearchPdf(productName, researchDoc);
  }

  const docForDisplay = localResearchDoc ?? researchDoc;

  if (!ready || !productName) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <ResearchNav
        productName={productName}
        sessionId={sessionId}
        onDownloadPdf={handleDownloadPdf}
        tokenCount={tokenCount}
      />
      <div className="flex-1 flex overflow-hidden">
        <SectionSidebar
          activeSection={activeSection}
          onSectionClick={setActiveSection}
          sections={docForDisplay?.sections}
        />
        <DocumentBody
          productName={productName}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          sectionOverrides={sectionOverrides}
          sectionVersions={sectionVersions}
          onUndoSection={handleUndoSection}
        />
        {docForDisplay && (
          <RightPanel
            sources={docForDisplay.sources}
            productName={productName}
            researchDoc={docForDisplay}
            onSectionUpdate={handleSectionUpdate}
          />
        )}
      </div>
    </div>
  );
}
