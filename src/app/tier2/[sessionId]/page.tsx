"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@/store/session";
import type { Tier2Answers } from "@/store/session";
import { selectTier2Questions } from "@/data/tier2Questions";
import IntakeNav from "@/components/intake/IntakeNav";
import ProductCard from "@/components/intake/ProductCard";
import OptionGrid from "@/components/intake/OptionGrid";
import MultiOptionGrid from "@/components/intake/MultiOptionGrid";

export default function Tier2Page() {
  const router          = useRouter();
  const productName     = useSessionStore((s) => s.productName);
  const sessionId       = useSessionStore((s) => s.sessionId);
  const tier1Answers    = useSessionStore((s) => s.tier1Answers);
  const setTier2Answers = useSessionStore((s) => s.setTier2Answers);

  const setActiveSession    = useSessionStore((s) => s.setActiveSession);
  const clearActiveSession  = useSessionStore((s) => s.clearActiveSession);
  const setTier2Draft       = useSessionStore((s) => s.setTier2Draft);
  const clearTier2Draft     = useSessionStore((s) => s.clearTier2Draft);

  const [ready, setReady]   = useState(false);
  const [step, setStep]     = useState(0);
  const [answers, setAnswers] = useState<Tier2Answers>({});

  const questions = useMemo(
    () => (tier1Answers ? selectTier2Questions(tier1Answers) : []),
    [tier1Answers]
  );

  const TOTAL = questions.length;

  useEffect(() => {
    const t = setTimeout(() => {
      const { tier2Step: savedStep, tier2AnswersDraft: savedAnswers } = useSessionStore.getState();
      if (savedStep > 0 || Object.keys(savedAnswers).length > 0) {
        setStep(savedStep);
        setAnswers(savedAnswers);
      }
      setReady(true);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && (!productName || !tier1Answers)) router.replace("/");
  }, [ready, productName, tier1Answers, router]);

  useEffect(() => {
    if (!ready || !productName || !sessionId || !TOTAL) return;
    setActiveSession({
      sessionId,
      productName,
      stageLabel: `In-Depth Questions (${step + 1}/${TOTAL})`,
      progress: Math.round(((step + 1) / TOTAL) * 100),
      resumePath: `/tier2/${sessionId}`,
    });
    setTier2Draft(step, answers);
  }, [ready, productName, sessionId, step, answers, TOTAL, setActiveSession, setTier2Draft]);

  useEffect(() => {
    return () => clearActiveSession();
  }, [clearActiveSession]);
  const current = questions[step];

  const currentAnswer = answers[current?.id ?? ""];
  const isMulti = current?.type === "multi";
  const multiSelected = isMulti
    ? new Set<string>(Array.isArray(currentAnswer) ? (currentAnswer as string[]) : [])
    : new Set<string>();

  function canContinue(): boolean {
    if (!current) return false;
    if (isMulti) return ((currentAnswer as string[] | undefined)?.length ?? 0) > 0;
    return typeof currentAnswer === "string" && currentAnswer.length > 0;
  }

  function handleSingleSelect(id: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: id }));
  }

  function handleMultiToggle(id: string) {
    setAnswers((prev) => {
      const existing = (prev[current.id] as string[] | undefined) ?? [];
      const set = new Set(existing);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, [current.id]: Array.from(set) };
    });
  }

  function handleContinue() {
    if (step < TOTAL - 1) {
      setStep((s) => s + 1);
      return;
    }
    clearActiveSession();
    clearTier2Draft();
    setTier2Answers(answers);
    router.push(`/context/${sessionId}`);
  }

  function handleBack() {
    if (step > 0) { setStep((s) => s - 1); return; }
    router.back();
  }

  if (!ready || !productName || !tier1Answers || !current) {
    return (
      <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans">
        <IntakeNav />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-tear-muted animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / TOTAL) * 100;
  const isLastStep = step === TOTAL - 1;

  return (
    <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-4 md:py-[22px] border-b border-[#F0E8DF] animate-fade-in">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
            <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden sm:inline text-[12px] font-medium text-tear-primary bg-[#FBF0EB] border border-[#F0C9B8] px-3 py-1 rounded-full whitespace-nowrap">
            In-Depth Questions
          </span>
          <span className="text-[13px] font-normal text-[#A89890] tracking-[0.02em] whitespace-nowrap">Step 3 of 5</span>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto py-6 md:py-10 px-5 md:px-6 pb-6 md:pb-24">
        <div className="max-w-[720px] mx-auto flex flex-col gap-8">

          <ProductCard productName={productName} />

          {/* Phase label */}
          <div className="flex items-center gap-3 flex-wrap animate-fade-up-1">
            <div className="flex items-center gap-2 bg-[#FBF0EB] border border-[#F0C9B8] px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-tear-primary" />
              <span className="text-[11px] font-semibold text-tear-primary tracking-[0.12em] uppercase">
                In-Depth Research Questions
              </span>
            </div>
            <span className="text-[12px] text-tear-muted">
              Based on your focus areas
            </span>
          </div>

          {/* Question header */}
          <div key={current.id} className="flex flex-col gap-2.5 animate-fade-up-2">
            <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-tear-primary">
              Question {step + 1} of {TOTAL}
            </span>
            <h2 className="font-lora text-[28px] font-medium leading-[1.25] text-tear-text tracking-[-0.01em]">
              {current.label}
            </h2>
            <p className="text-[15px] font-normal leading-[1.6] text-tear-muted">{current.sub}</p>
            {isMulti && (
              <span className="text-[12px] font-medium text-[#A89890] bg-[#F5EFE4] border border-tear-border rounded-full px-3 py-1 self-start">
                Select all that apply
              </span>
            )}
          </div>

          {/* Answer grid */}
          {isMulti ? (
            <MultiOptionGrid
              key={`multi-${current.id}`}
              options={current.options}
              selected={multiSelected}
              onToggle={handleMultiToggle}
            />
          ) : (
            <OptionGrid
              key={`single-${current.id}`}
              options={current.options}
              selected={(currentAnswer as string) ?? ""}
              onSelect={handleSingleSelect}
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 md:gap-6 mt-2 animate-fade-up-4 sticky bottom-0 bg-tear-bg pt-4 pb-4 md:pb-0 md:static md:bg-transparent border-t md:border-t-0 border-[#EDE5DC] -mx-5 px-5 md:mx-0 md:px-0">
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="h-1 bg-tear-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-tear-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-[#A89890] font-normal">
                {step + 1} of {TOTAL} in-depth questions complete
              </span>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <button
                onClick={handleBack}
                className="px-3 md:px-5 py-3.5 text-[15px] font-medium text-tear-muted hover:text-tear-text transition-colors duration-150 whitespace-nowrap"
              >
                ← Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!canContinue()}
                className={`
                  px-5 md:px-7 py-3.5 text-[15px] font-medium text-white rounded-lg border-none
                  transition-all duration-150 whitespace-nowrap
                  ${canContinue()
                    ? "bg-tear-primary hover:opacity-90 cursor-pointer"
                    : "bg-[#D6CEC8] cursor-not-allowed"
                  }
                `}
              >
                {isLastStep ? "Start Analysis →" : "Continue →"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
