export default function TeardownPreview({ productName }: { productName: string }) {
  return (
    <div className="w-[45%] flex flex-col bg-tear-bg overflow-hidden">
      {/* Panel header */}
      <div className="px-9 pt-5 pb-3.5 flex-shrink-0 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.13em] uppercase text-[#A89890]">
          Teardown Preview
        </span>
        <div className="flex items-center gap-1.5">
          <div className="gen-dot" />
          <span className="text-[12px] italic text-[#A89890]">Generating...</span>
        </div>
      </div>

      {/* Document preview */}
      <div className="flex-1 overflow-hidden px-9 pt-2 relative">
        <div className="flex flex-col gap-5">

          {/* Executive Summary */}
          <div className="flex flex-col gap-3">
            <h2 className="font-lora text-xl font-semibold text-tear-text tracking-[-0.01em] pb-2.5 border-b-[1.5px] border-tear-border">
              Executive Summary
            </h2>
            <p className="text-[14px] font-normal leading-[1.75] text-tear-text">
              {productName} is an all-in-one workspace that has grown from a notes tool into a
              horizontal productivity platform serving over 30 million users globally. Its core
              strength lies in its highly flexible block-based editor, which allows teams to
              build custom workflows without engineering resources.
            </p>
            <p className="text-[14px] font-normal leading-[1.75] text-tear-text">
              The product occupies a unique positioning: too powerful for casual users, yet
              accessible enough to displace legacy tools like Confluence. The 2024 shift toward
              AI-native features marks a deliberate move to defend against emerging competitors.
            </p>
            <p className="text-[14px] font-normal leading-[1.75] text-[#3D2F2B]">
              User sentiment analysis from 847 G2 reviews reveals a consistent friction point
              around
            </p>
          </div>

          {/* Business Model — generating */}
          <div className="flex flex-col gap-3">
            <h2 className="font-lora text-xl font-semibold text-tear-text tracking-[-0.01em] pb-2.5 border-b-[1.5px] border-tear-border">
              Business Model & Revenue
            </h2>
            <p className="text-[14px] font-normal leading-[1.75] text-tear-text">
              {productName} operates on a freemium SaaS model with multiple tiers spanning
              individual, team, and enterprise plans
              <span className="stream-cursor" />
            </p>
          </div>
        </div>

        {/* Fade-out gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 0%, #FDFAF6 100%)" }}
        />

        {/* Generating label */}
        <div className="absolute bottom-6 left-9 right-9 flex items-center gap-2 z-10">
          <div className="gen-dot" />
          <span className="text-[12px] italic text-[#A89890]">Generating Business Model section...</span>
        </div>
      </div>

      {/* Sources footer */}
      <div className="px-9 py-3.5 pb-5 border-t border-[#EDE5DC] flex-shrink-0 flex items-center gap-4">
        <span className="text-[12px] text-[#A89890] whitespace-nowrap">Sources crawled so far:</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-medium text-tear-primary">3</span>
          <span className="text-[12px] text-tear-chip-border">/</span>
          <span className="font-mono text-[12px] text-[#A89890]">7</span>
          <span className="text-[12px] text-[#A89890]">sources</span>
        </div>
        <div className="flex-1 h-[3px] bg-tear-border rounded-full overflow-hidden">
          <div className="w-[43%] h-full bg-tear-primary rounded-full" />
        </div>
      </div>
    </div>
  );
}
