"use client";

import { useSessionStore } from "@/store/session";
import type { DeckSlide, DeckData } from "@/types/teardown";
import type { SlideInfo } from "./SlideThumbnails";

// ─── SlideInfo helpers ─────────────────────────────────────────────────────────

export function getMockSlides(productName: string): SlideInfo[] {
  return [
    { title: productName, isCover: true },
    { title: "Executive Summary" },
    { title: "Product & UX" },
    { title: "Business Model & Revenue" },
    { title: "GTM & Growth" },
    { title: "Technical Architecture" },
    { title: "Market & Competition" },
    { title: "Community & Ecosystem" },
    { title: "Financials & Funding" },
    { title: "Sources & Appendix" },
  ];
}

export function getSlidesInfo(deck: DeckData): SlideInfo[] {
  return deck.slides.map((s) => ({ title: s.title, isCover: s.type === "cover" }));
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function SlideHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 pb-4 border-b border-[#E8DDD2] mb-5">
      <span className="font-mono text-[11px] text-[#C2451E] font-medium">{num}</span>
      <h2 className="font-lora text-[28px] font-semibold text-[#1C1412] tracking-[-0.02em] leading-none">{title}</h2>
    </div>
  );
}

function Bullet({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <div className="w-1.5 h-1.5 rounded-full bg-[#C2451E] flex-shrink-0 mt-[8px]" />
      <div>
        <span className="text-[15px] leading-[1.6] text-[#1C1412] font-medium">{text}</span>
        {sub && <span className="block text-[13px] text-[#7C6E68] leading-[1.5] mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

function StatTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 bg-[#F5EFE4] rounded-[10px] border border-[#E8DDD2]">
      <span className="font-mono text-[22px] font-semibold text-[#C2451E]">{value}</span>
      <span className="text-[11px] text-[#7C6E68] font-medium text-center leading-[1.3]">{label}</span>
    </div>
  );
}

function ThreatColor(t: string) {
  return t === "High" ? "#C2451E" : t === "Medium" ? "#B07040" : "#22A05B";
}

// ─── Data-driven slide renderers ───────────────────────────────────────────────

function CoverSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-[#C2451E] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0, transparent 50%), radial-gradient(circle at 80% 20%, white 0, transparent 50%)" }}
      />
      <div className="flex items-center gap-2 mb-6 opacity-70">
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
          <circle cx="9.5" cy="9.5" r="7" stroke="white" strokeWidth="1.7" fill="none" />
          <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="font-lora text-[15px] font-semibold text-white/80 tracking-tight">Tear</span>
      </div>
      <h1 className="font-lora text-[52px] font-semibold text-white tracking-[-0.03em] leading-none mb-4 text-center px-8">
        {slide.title}
      </h1>
      <p className="text-[16px] text-white/70 font-dm-sans mb-10 text-center">
        {slide.subtitle ?? "AI-Powered Product Teardown"}
      </p>
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3">
        <div className="h-[1px] w-10 bg-white/20" />
        <span className="text-[11px] text-white/40 font-mono font-medium uppercase tracking-[0.12em]">
          Powered by Tear · {new Date().getFullYear()}
        </span>
        <div className="h-[1px] w-10 bg-white/20" />
      </div>
    </div>
  );
}

function BulletsSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "01"} title={slide.title} />
      <div className="flex-1 flex gap-8">
        <div className="flex-1 flex flex-col gap-2">
          {slide.bullets?.map((b, i) => <Bullet key={i} text={b.text} sub={b.sub} />)}
        </div>
        {slide.stats && slide.stats.length > 0 && (
          <div className="w-[220px] flex-shrink-0 flex flex-col gap-3">
            {slide.stats.map((s) => <StatTag key={s.label} label={s.label} value={s.value} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function FeaturesSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "02"} title={slide.title} />
      <div className="flex-1 grid grid-cols-3 gap-4">
        {slide.items?.map((f) => (
          <div key={f.name} className="bg-[#F9F5EF] rounded-[10px] border border-[#E8DDD2] p-5 flex flex-col gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#FBF0EB] border border-[#E8DDD2] flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#C2451E] opacity-70" />
            </div>
            <span className="text-[15px] font-semibold text-[#1C1412] leading-tight">{f.name}</span>
            <span className="text-[13px] text-[#7C6E68] leading-[1.55]">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "03"} title={slide.title} />
      <div className="flex-1 flex flex-col gap-4">
        <div className="grid gap-3 flex-1" style={{ gridTemplateColumns: `repeat(${slide.tiers?.length ?? 4}, 1fr)` }}>
          {slide.tiers?.map((t) => (
            <div key={t.name} className={`rounded-[10px] border p-5 flex flex-col gap-2 ${t.highlight ? "border-[#C2451E] bg-[#FBF0EB]" : "border-[#E8DDD2] bg-[#F9F5EF]"}`}>
              <span className={`text-[11px] font-semibold tracking-[0.12em] uppercase ${t.highlight ? "text-[#C2451E]" : "text-[#A89890]"}`}>{t.name}</span>
              <span className="font-mono text-[20px] font-semibold text-[#1C1412] leading-none">{t.price}</span>
              <span className="text-[12px] text-[#7C6E68]">{t.target}</span>
            </div>
          ))}
        </div>
        {slide.revenueStats && (
          <div className="grid grid-cols-3 gap-3">
            {slide.revenueStats.map((s) => (
              <div key={s.label} className="bg-[#F5EFE4] rounded-[8px] p-4 border border-[#E8DDD2]">
                <span className="font-mono text-[18px] font-semibold text-[#C2451E]">{s.value}</span>
                <span className="block text-[12px] text-[#7C6E68] mt-0.5">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GTMSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "04"} title={slide.title} />
      <div className="flex-1 flex flex-col gap-3">
        {slide.phases?.map((p, i) => (
          <div key={i} className="flex gap-4 items-start p-5 bg-[#F9F5EF] rounded-[10px] border border-[#E8DDD2] flex-1">
            <div className="w-8 h-8 rounded-full bg-[#FBF0EB] border border-[#E8DDD2] flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="font-mono text-[11px] font-semibold text-[#C2451E]">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="flex-1">
              <span className="text-[14px] font-semibold text-[#1C1412] block mb-1">{p.label}</span>
              <span className="text-[13px] text-[#7C6E68] leading-[1.5]">{p.desc}</span>
            </div>
            {p.metric && (
              <span className="font-mono text-[12px] font-medium text-[#C2451E] flex-shrink-0 bg-[#FBF0EB] px-2.5 py-1 rounded-[6px] border border-[#E8DDD2]">
                {p.metric}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TechStackSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "05"} title={slide.title} />
      <div className="flex-1 flex flex-col gap-2">
        {slide.layers?.map((l, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3 rounded-[8px] border bg-[#F9F5EF] border-[#E8DDD2] flex-1">
            <span className="font-mono text-[11px] font-medium text-[#C2451E] w-[100px] flex-shrink-0">{l.layer}</span>
            <div className="h-4 w-[1px] bg-[#D6CEC8]" />
            <span className="text-[13px] text-[#1C1412]">{l.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitiveSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "06"} title={slide.title} />
      <div className="flex-1 flex gap-6">
        <div className="flex-1 flex flex-col gap-2">
          {slide.competitors?.map((c) => (
            <div key={c.name} className="flex items-center gap-3 px-4 py-3 bg-[#F9F5EF] rounded-[8px] border border-[#E8DDD2]">
              <span className="text-[13px] font-semibold text-[#1C1412] w-[90px]">{c.name}</span>
              <span className="text-[13px] text-[#7C6E68] flex-1">{c.angle}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px]"
                style={{ color: ThreatColor(c.threat), background: `${ThreatColor(c.threat)}18` }}>
                {c.threat}
              </span>
            </div>
          ))}
        </div>
        {(slide.tam || slide.cagr) && (
          <div className="w-[200px] flex-shrink-0 flex flex-col gap-3">
            <div className="bg-[#FBF0EB] rounded-[10px] border border-[#E8DDD2] p-5 flex-1 flex flex-col justify-between">
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#A89890] mb-3 block">TAM</span>
              <span className="font-mono text-[28px] font-semibold text-[#C2451E] leading-none">{slide.tam}</span>
              <span className="text-[12px] text-[#7C6E68] mt-2">Total addressable market</span>
              {slide.cagr && <span className="font-mono text-[13px] text-[#C2451E] mt-3">{slide.cagr} CAGR</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "07"} title={slide.title} />
      <div className="flex-1 flex flex-col gap-4">
        <div className="grid gap-3 flex-1" style={{ gridTemplateColumns: `repeat(${Math.min(slide.stats?.length ?? 5, 5)}, 1fr)` }}>
          {slide.stats?.map((s) => (
            <div key={s.label} className="bg-[#F9F5EF] rounded-[10px] border border-[#E8DDD2] flex flex-col items-center justify-center gap-2 p-4">
              <span className="font-mono text-[24px] font-semibold text-[#C2451E] leading-none">{s.value}</span>
              <span className="text-[11px] text-[#7C6E68] text-center leading-[1.3]">{s.label}</span>
            </div>
          ))}
        </div>
        {slide.insight && (
          <div className="px-4 py-3 bg-[#FBF0EB] border-l-[3px] border-[#C2451E] rounded-r-[8px]">
            <span className="text-[13px] text-[#3D2F2B] font-medium">{slide.insight}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FundingSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-white p-10 flex flex-col">
      <SlideHeader num={slide.sectionNum ?? "08"} title={slide.title} />
      <div className="flex-1 flex gap-6">
        <div className="flex-1 flex flex-col gap-2">
          {slide.rounds?.map((r, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 bg-[#F9F5EF] rounded-[10px] border border-[#E8DDD2] flex-1">
              <div className="w-[30px] h-[30px] rounded-full bg-[#FBF0EB] border border-[#E8DDD2] flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[9px] font-medium text-[#C2451E]">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="flex-1">
                <span className="text-[13px] font-semibold text-[#1C1412]">{r.round} · {r.year}</span>
                <span className="block text-[12px] text-[#7C6E68]">{r.lead}</span>
              </div>
              <span className="font-mono text-[16px] font-semibold text-[#C2451E]">{r.amount}</span>
            </div>
          ))}
        </div>
        <div className="w-[180px] flex-shrink-0 flex flex-col gap-3">
          {slide.totalRaised && (
            <div className="bg-[#FBF0EB] rounded-[10px] border border-[#E8DDD2] p-5 flex flex-col gap-1">
              <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#A89890]">Total raised</span>
              <span className="font-mono text-[26px] font-semibold text-[#C2451E] leading-none">{slide.totalRaised}</span>
            </div>
          )}
          <div className="bg-[#F5EFE4] rounded-[10px] border border-[#E8DDD2] p-5 flex flex-col gap-1 flex-1">
            {slide.valuation && <>
              <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#A89890]">Valuation</span>
              <span className="font-mono text-[26px] font-semibold text-[#1C1412] leading-none">{slide.valuation}</span>
            </>}
            {slide.arr && (
              <div className="mt-3 pt-3 border-t border-[#E8DDD2]">
                <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#A89890] block mb-1">Est. ARR</span>
                <span className="font-mono text-[20px] font-semibold text-[#C2451E] leading-none">{slide.arr}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SourcesSlide({ slide }: { slide: DeckSlide }) {
  return (
    <div className="w-full h-full bg-[#F9F5EF] p-10 flex flex-col">
      <div className="flex items-baseline gap-3 pb-4 border-b border-[#E8DDD2] mb-6">
        <h2 className="font-lora text-[26px] font-semibold text-[#1C1412] tracking-[-0.02em] leading-none">{slide.title}</h2>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-1 content-start">
        {slide.sources?.map((s, i) => (
          <div key={i} className="flex items-start gap-2.5 py-2 border-b border-[#E8DDD2]">
            <span className="font-mono text-[11px] text-[#C2451E] font-medium flex-shrink-0 mt-0.5">
              {s.match(/^\[\d+\]/)?.[0] ?? `[${i + 1}]`}
            </span>
            <span className="text-[12px] text-[#7C6E68] leading-[1.5]">
              {s.replace(/^\[\d+\]\s*/, "")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#E8DDD2]">
        <span className="text-[11px] text-[#A89890] font-mono">Generated by Tear · AI Product Teardowns</span>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
            <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
            <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className="font-lora text-[14px] font-semibold text-[#1C1412]">Tear</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main canvas ───────────────────────────────────────────────────────────────

const RENDERERS: Record<string, (slide: DeckSlide) => React.ReactNode> = {
  cover:       (s) => <CoverSlide slide={s} />,
  bullets:     (s) => <BulletsSlide slide={s} />,
  features:    (s) => <FeaturesSlide slide={s} />,
  pricing:     (s) => <PricingSlide slide={s} />,
  gtm:         (s) => <GTMSlide slide={s} />,
  techstack:   (s) => <TechStackSlide slide={s} />,
  competitive: (s) => <CompetitiveSlide slide={s} />,
  stats:       (s) => <StatsSlide slide={s} />,
  funding:     (s) => <FundingSlide slide={s} />,
  sources:     (s) => <SourcesSlide slide={s} />,
};

interface SlideCanvasProps {
  productName: string;
  slideIndex: number;
}

export default function SlideCanvas({ productName, slideIndex }: SlideCanvasProps) {
  const deckData = useSessionStore((s) => s.deckData);

  const slide: DeckSlide | undefined = deckData?.slides[slideIndex];

  // Fallback cover when no data yet
  const fallback: DeckSlide = {
    type: "cover",
    title: productName,
    subtitle: "AI-Powered Product Teardown",
  };

  const activeSlide = slide ?? fallback;
  const render = RENDERERS[activeSlide.type] ?? RENDERERS.cover;

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-4 md:p-10 bg-[#EAE3DA]">
      <div
        className="bg-white shadow-[0_4px_48px_rgba(0,0,0,0.14)] rounded-[12px] overflow-hidden w-full max-w-5xl"
        style={{ aspectRatio: "16/9" }}
      >
        {render(activeSlide)}
      </div>
    </div>
  );
}
