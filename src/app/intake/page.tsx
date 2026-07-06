"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import IntakeNav from "@/components/intake/IntakeNav";
import ProductCard from "@/components/intake/ProductCard";
import DimensionGrid from "@/components/intake/DimensionGrid";
import OptionGrid from "@/components/intake/OptionGrid";
import IntakeFooter from "@/components/intake/IntakeFooter";

const TOTAL_STEPS = 3;

const GOALS = [
  { id: "competitive", label: "Competitive analysis", sub: "Understand how it stacks up against alternatives" },
  { id: "learning",    label: "PM / product learning", sub: "Deepen your understanding of product decisions" },
  { id: "investor",   label: "Investor due diligence", sub: "Evaluate the product from an investment lens" },
  { id: "curiosity",  label: "General curiosity", sub: "Just want to understand this product deeply" },
];

const DEPTHS = [
  { id: "quick",    label: "Quick overview",  sub: "~5 min · High-level summary of the product" },
  { id: "standard", label: "Full teardown",   sub: "~10 min · Structured 8-section research document" },
  { id: "deep",     label: "Deep dive",       sub: "~20 min · Exhaustive analysis with all citations" },
];

const QUESTIONS = [
  { label: "Which dimensions matter most to you?",  sub: "Select all that apply. We'll focus the research agents on these areas." },
  { label: "What's your primary research goal?",    sub: "This helps us frame the teardown from the right angle." },
  { label: "How deep should the research go?",      sub: "Choose the level of detail you need." },
];

export default function IntakePage() {
  const router = useRouter();
  const productName   = useSessionStore((s) => s.productName);
  const sessionId     = useSessionStore((s) => s.sessionId);
  const setTier1Answers = useSessionStore((s) => s.setTier1Answers);

  const [step, setStep]           = useState(1);
  const [dimensions, setDimensions] = useState<Set<string>>(new Set());
  const [goal, setGoal]           = useState("");
  const [depth, setDepth]         = useState("");
  const [ready, setReady]         = useState(false);

  // Wait one tick for Zustand to hydrate from localStorage, then check
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  function canContinue() {
    if (step === 1) return dimensions.size > 0;
    if (step === 2) return !!goal;
    if (step === 3) return !!depth;
    return false;
  }

  function handleContinue() {
    if (step < TOTAL_STEPS) { setStep((s) => s + 1); return; }
    setTier1Answers({ dimensions: Array.from(dimensions), goal, depth });
    router.push(`/tier2/${sessionId}`);
  }

  function toggleDimension(id: string) {
    setDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // Show skeleton until hydrated
  if (!ready || !productName) {
    return (
      <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans">
        <IntakeNav />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-tear-muted animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step - 1];

  return (
    <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text">
      <IntakeNav />
      <div className="flex-1 overflow-y-auto py-10 px-6 pb-20">
        <div className="max-w-[720px] mx-auto flex flex-col gap-8">

          <ProductCard productName={productName} />

          <div className="flex flex-col gap-2.5 animate-fade-up-2">
            <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-tear-primary">
              Question {step} of {TOTAL_STEPS}
            </span>
            <h2 className="font-lora text-[28px] font-medium leading-[1.25] text-tear-text tracking-[-0.01em]">
              {q.label}
            </h2>
            <p className="text-[15px] font-normal leading-[1.6] text-tear-muted">{q.sub}</p>
          </div>

          {step === 1 && <DimensionGrid selected={dimensions} onToggle={toggleDimension} />}
          {step === 2 && <OptionGrid options={GOALS} selected={goal} onSelect={setGoal} />}
          {step === 3 && <OptionGrid options={DEPTHS} selected={depth} onSelect={setDepth} />}

          <IntakeFooter
            step={step}
            totalSteps={TOTAL_STEPS}
            canContinue={canContinue()}
            onContinue={handleContinue}
            onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
