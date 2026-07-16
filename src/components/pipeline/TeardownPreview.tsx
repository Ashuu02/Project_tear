"use client";

interface TeardownPreviewProps {
  productName: string;
  previewText?: string;
  sourceProgress?: { crawled: number; total: number };
  activeOnMobile?: boolean;
}

export default function TeardownPreview({ productName, previewText, sourceProgress, activeOnMobile = false }: TeardownPreviewProps) {
  const crawled = sourceProgress?.crawled ?? 0;
  const total   = sourceProgress?.total ?? 7;
  const pct     = total > 0 ? Math.min(100, Math.round((crawled / total) * 100)) : 0;
  const isGenerating = !previewText;

  return (
    <div className={`${activeOnMobile ? "flex" : "hidden"} md:flex w-full md:w-[45%] flex-col bg-tear-bg overflow-hidden`}>
      {/* Panel header */}
      <div className="px-5 md:px-9 pt-5 pb-3.5 flex-shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">
          Teardown Preview
        </span>
        {isGenerating && (
          <div className="flex items-center gap-1.5">
            <div className="gen-dot" />
            <span className="text-[12px] italic text-[#A89890]">Generating…</span>
          </div>
        )}
      </div>

      {/* Document preview */}
      <div className="flex-1 overflow-hidden px-5 md:px-9 pt-2 relative">
        {previewText ? (
          <div className="flex flex-col gap-5 animate-fade-up-2">
            <div className="flex flex-col gap-3">
              <h2 className="font-lora text-xl font-semibold text-tear-text tracking-[-0.01em] pb-2.5 border-b-[1.5px] border-tear-border">
                Executive Summary
              </h2>
              {previewText.split("\n\n").filter(Boolean).map((para, i) => (
                <p key={i} className="text-[14px] font-normal leading-[1.75] text-tear-text">
                  {para}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-lora text-xl font-semibold text-tear-text tracking-[-0.01em] pb-2.5 border-b-[1.5px] border-tear-border">
                Business Model & Revenue
              </h2>
              <p className="text-[14px] font-normal leading-[1.75] text-tear-text">
                Synthesizing business model data
                <span className="stream-cursor" />
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <h2 className="font-lora text-xl font-semibold text-tear-text tracking-[-0.01em] pb-2.5 border-b-[1.5px] border-tear-border">
                Executive Summary
              </h2>
              <p className="text-[14px] font-normal leading-[1.75] text-tear-text">
                {productName} is being researched by the agent pipeline. The document will appear here
                once the Crawler and Document agents complete their work.
              </p>
              <p className="text-[14px] font-normal leading-[1.75] text-[#3D2F2B]">
                The analysis covers product UX, business model, go-to-market strategy, technical
                architecture, competitive landscape, community
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="font-lora text-xl font-semibold text-tear-text tracking-[-0.01em] pb-2.5 border-b-[1.5px] border-tear-border">
                Business Model & Revenue
              </h2>
              <p className="text-[14px] font-normal leading-[1.75] text-tear-text">
                Awaiting research data
                <span className="stream-cursor" />
              </p>
            </div>
          </div>
        )}

        {/* Fade-out gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 0%, #FDFAF6 100%)" }}
        />

        {isGenerating && (
          <div className="absolute bottom-6 left-5 right-5 md:left-9 md:right-9 flex items-center gap-2 z-10">
            <div className="gen-dot" />
            <span className="text-[12px] italic text-[#A89890]">Agents working…</span>
          </div>
        )}
      </div>

      {/* Sources footer */}
      <div className="px-5 md:px-9 py-3.5 pb-5 border-t border-[#EDE5DC] flex-shrink-0 flex items-center gap-4">
        <span className="hidden sm:inline text-[12px] text-[#A89890] whitespace-nowrap">Sources crawled:</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-medium text-tear-primary">{crawled}</span>
          <span className="text-[12px] text-tear-chip-border">/</span>
          <span className="font-mono text-[12px] text-[#A89890]">{total}</span>
          <span className="text-[12px] text-[#A89890]">sources</span>
        </div>
        <div className="flex-1 h-[3px] bg-tear-border rounded-full overflow-hidden">
          <div
            className="h-full bg-tear-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
