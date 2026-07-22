"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import ResearchNav from "@/components/research/ResearchNav";
import SectionSidebar from "@/components/research/SectionSidebar";
import DocumentBody from "@/components/research/DocumentBody";
import RightPanel from "@/components/research/RightPanel";
import type { ResearchDoc } from "@/types/teardown";
import { track } from "@/lib/posthog";

const MAX_VERSIONS = 5;

export default function ResearchPage() {
  const router              = useRouter();
  const productName         = useSessionStore((s) => s.productName);
  const sessionId           = useSessionStore((s) => s.sessionId);
  const researchDoc         = useSessionStore((s) => s.researchDoc);
  const clearActiveSession  = useSessionStore((s) => s.clearActiveSession);
  const isViewingHistory    = useSessionStore((s) => s.isViewingHistory);

  const [ready, setReady]                     = useState(false);
  const [activeSection, setActiveSection]     = useState("exec_summary");
  const trackedRef = useRef(false);
  const [tokenCount, setTokenCount]           = useState<number | undefined>();
  const [sheetOpen, setSheetOpen]             = useState(false);
  const [mobileTab, setMobileTab]             = useState<"contents" | "sources">("contents");

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
    if (ready && productName && researchDoc && !trackedRef.current) {
      trackedRef.current = true;
      track("research_viewed", { product_name: productName, sections_count: researchDoc.sections?.length ?? 0 });
    }
  }, [researchDoc, ready, productName]);

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
        isViewingHistory={isViewingHistory}
      />
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex md:flex-shrink-0">
          <SectionSidebar
            activeSection={activeSection}
            onSectionClick={setActiveSection}
            sections={docForDisplay?.sections}
          />
        </div>
        <DocumentBody
          productName={productName}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          sectionOverrides={sectionOverrides}
          sectionVersions={sectionVersions}
          onUndoSection={handleUndoSection}
        />
        {docForDisplay && (
          <div className="hidden md:flex md:flex-shrink-0">
            <RightPanel
              sources={docForDisplay.sources}
              productName={productName}
              researchDoc={docForDisplay}
              onSectionUpdate={handleSectionUpdate}
            />
          </div>
        )}
      </div>

      {/* Mobile: bottom sheet peek bar for ToC + sources */}
      <button
        onClick={() => setSheetOpen(true)}
        className="md:hidden flex-shrink-0 flex items-center justify-between px-5 py-3 bg-[#F5EFE4] border-t-[1.5px] border-tear-border"
      >
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <line x1="2.5" y1="4" x2="13.5" y2="4" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="2.5" y1="8" x2="13.5" y2="8" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="2.5" y1="12" x2="9" y2="12" stroke="#7C6E68" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-semibold text-tear-text">Contents &amp; sources</span>
        </div>
        <span className="font-mono text-[12px] text-tear-primary">
          {docForDisplay?.sources?.length ?? 0} sources
        </span>
      </button>

      {sheetOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative bg-tear-bg rounded-t-2xl h-[75vh] flex flex-col overflow-hidden z-10 border-t border-tear-border">
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-tear-chip-border" />
            </div>
            <div className="flex px-5 pb-3 gap-2 flex-shrink-0">
              <button
                onClick={() => setMobileTab("contents")}
                className={`flex-1 text-center py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  mobileTab === "contents" ? "bg-tear-text text-white" : "bg-[#F5EFE4] text-tear-muted border border-tear-border"
                }`}
              >
                Contents
              </button>
              <button
                onClick={() => setMobileTab("sources")}
                className={`flex-1 text-center py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  mobileTab === "sources" ? "bg-tear-text text-white" : "bg-[#F5EFE4] text-tear-muted border border-tear-border"
                }`}
              >
                Sources &amp; Ask
              </button>
            </div>
            <div className="flex-1 flex overflow-hidden">
              {mobileTab === "contents" ? (
                <SectionSidebar
                  activeSection={activeSection}
                  onSectionClick={(id) => { setActiveSection(id); setSheetOpen(false); }}
                  sections={docForDisplay?.sections}
                />
              ) : (
                docForDisplay && (
                  <RightPanel
                    sources={docForDisplay.sources}
                    productName={productName}
                    researchDoc={docForDisplay}
                    onSectionUpdate={handleSectionUpdate}
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
