"use client";

import CitationsPanel from "@/components/research/CitationsPanel";
import ResearchChatbot from "@/components/research/ResearchChatbot";
import type { TeardownSource } from "@/types/teardown";
import type { ResearchDoc } from "@/types/teardown";

interface RightPanelProps {
  sources?: TeardownSource[];
  productName: string;
  researchDoc: ResearchDoc;
  onSectionUpdate: (sectionId: string, newContent: string) => void;
}

export default function RightPanel({ sources, productName, researchDoc, onSectionUpdate }: RightPanelProps) {
  return (
    <div className="w-full md:w-[280px] flex-1 md:flex-none md:flex-shrink-0 border-l-0 md:border-l border-[#EDE5DC] flex flex-col overflow-hidden">
      <CitationsPanel sources={sources} />
      <ResearchChatbot
        productName={productName}
        researchDoc={researchDoc}
        onSectionUpdate={onSectionUpdate}
      />
    </div>
  );
}
