"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@/store/session";
import { useTeardownHistory } from "@/store/teardownHistory";
import type { DeckData } from "@/types/teardown";

interface DeckConfig {
  slideCount: number;
  theme: string;
  focus: string[];
  tone: string;
  charts: boolean;
}

const THEMES = [
  { value: "dark", label: "Dark Executive", swatch: "#18181B", swatchBorder: false },
  { value: "light", label: "Light Minimal", swatch: "#FFFFFF", swatchBorder: true },
  { value: "gradient", label: "Gradient Modern", swatch: "linear-gradient(135deg,#5B3FC8,#2D7EE7)", swatchBorder: false },
  { value: "warm", label: "Warm Editorial", swatch: "linear-gradient(135deg,#C2451E,#F5EFE4)", swatchBorder: false },
];

const FOCUS_OPTIONS = [
  { value: "quantitative", label: "Quantitative data" },
  { value: "framework", label: "Framework visuals" },
  { value: "narrative", label: "Narrative storytelling" },
  { value: "mixed", label: "Mixed balanced" },
];

const TONE_OPTIONS = [
  { value: "internal", label: "Internal team" },
  { value: "investor", label: "Investor pitch" },
  { value: "client", label: "Client-facing" },
  { value: "conference", label: "Conference talk" },
];

export default function DeckConfigPage() {
  const router       = useRouter();
  const productName  = useSessionStore((s) => s.productName);
  const sessionId    = useSessionStore((s) => s.sessionId);
  const researchDoc  = useSessionStore((s) => s.researchDoc);
  const setDeckData  = useSessionStore((s) => s.setDeckData);
  const setDeckThemeKey = useSessionStore((s) => s.setDeckThemeKey);
  const selectedModel = useSessionStore((s) => s.selectedModel);

  const deckData     = useSessionStore((s) => s.deckData);
  const updateHistoryEntry = useTeardownHistory((s) => s.updateEntry);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [config, setConfig] = useState<DeckConfig>({
    slideCount: 10,
    theme: "warm",
    focus: ["narrative", "mixed"],
    tone: "investor",
    charts: true,
  });

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  // Generation is a chain of real network calls (LLM + Supabase + PPTX build) that can
  // legitimately take 30-90s — without a running counter a static "Generating…" spinner
  // reads as hung well before it actually is, and people bail via Stop or a refresh.
  useEffect(() => {
    if (!loading) { setElapsedSec(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  function toggleFocus(val: string) {
    setConfig((c) => ({
      ...c,
      focus: c.focus.includes(val) ? c.focus.filter((f) => f !== val) : [...c.focus, val],
    }));
  }

  async function handleGenerate() {
    if (!researchDoc || loading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const summaryForDeck = researchDoc.sections.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.content?.slice(0, 300),
        keyInsight: s.keyInsight,
        stats: s.stats,
      }));
      const res = await fetch("/api/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, sections: summaryForDeck, config, sessionId, model: selectedModel ?? "claude" }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Deck generation failed");
      const data = (await res.json()) as DeckData;
      // Each of these persists to localStorage and can throw (e.g. quota exceeded) even though
      // the in-memory store update it wraps already succeeded — never let that block navigation
      // to the deck the user already paid the generation cost for.
      try {
        setDeckData(data);
        setDeckThemeKey(config.theme);
      } catch (persistErr) {
        console.error("Failed to persist deck data:", persistErr);
      }
      try {
        updateHistoryEntry(sessionId, { deckData: data });
      } catch (historyErr) {
        console.error("Failed to update teardown history:", historyErr);
      }
      router.push(`/deck/${sessionId}/edit`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Deck generation failed:", err);
      setLoading(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  if (!ready || !productName) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 py-[18px] border-b border-[#EDE5DC] flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
            <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
        </Link>
        <span className="text-[13px] text-tear-muted font-normal">
          {productName} Teardown · Build your deck
        </span>
        <div />
      </nav>

      {/* Page header */}
      <div className="pt-[52px] pb-9 px-6 text-center flex flex-col items-center gap-3">
        <h1 className="font-lora text-[32px] font-semibold text-tear-text tracking-tight">
          Build your deck
        </h1>
        <p className="text-[15px] text-tear-muted max-w-[460px] leading-relaxed">
          Configure how you want the deck to look and feel. We&apos;ll generate it slide by slide.
        </p>
      </div>

      {/* Config card + CTA */}
      <div className="px-6 pb-16 flex flex-col items-center gap-5">
        <div className="w-full max-w-[680px] bg-[#F5EFE4] border border-[#E8DDD2] rounded-2xl px-8 py-8 flex flex-col">

          {/* Slide count */}
          <div className="pb-7">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-tear-text">Number of slides</p>
                <p className="text-[13px] text-[#A89890] mt-1">More slides means more depth (recommended: 10)</p>
              </div>
              <div className="flex gap-2.5">
                {([5, 10, 15, 20] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, slideCount: n }))}
                    disabled={loading}
                    className={`px-[22px] py-2 rounded-full text-sm font-medium border-[1.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                      config.slideCount === n
                        ? "bg-tear-primary border-tear-primary text-white"
                        : "bg-transparent border-[#E8DDD2] text-tear-muted hover:border-tear-primary hover:text-tear-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-[#EDE5DC] -mx-8" />

          {/* Theme */}
          <div className="py-7">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-tear-text">Theme</p>
                <p className="text-[13px] text-[#A89890] mt-1">Choose the visual style for your slides</p>
              </div>
              <div className="flex gap-3">
                {THEMES.map((theme) => {
                  const active = config.theme === theme.value;
                  return (
                    <button
                      key={theme.value}
                      onClick={() => setConfig((c) => ({ ...c, theme: theme.value }))}
                      disabled={loading}
                      className={`flex-1 border-2 rounded-[10px] p-2.5 flex flex-col gap-2 items-center transition-all duration-150 bg-white disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? "border-tear-primary shadow-[0_0_0_3px_rgba(194,69,30,0.1)]"
                          : "border-[#E8DDD2] hover:border-tear-primary"
                      }`}
                    >
                      <div
                        className="w-full h-11 rounded-[6px]"
                        style={{
                          background: theme.swatch,
                          border: theme.swatchBorder ? "1px solid #E8DDD2" : undefined,
                        }}
                      />
                      <span className={`text-xs font-medium ${active ? "text-tear-primary" : "text-tear-muted"}`}>
                        {theme.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-[#EDE5DC] -mx-8" />

          {/* Content focus */}
          <div className="py-7">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-tear-text">Content focus</p>
                <p className="text-[13px] text-[#A89890] mt-1">Select all that apply</p>
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {FOCUS_OPTIONS.map((opt) => {
                  const active = config.focus.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleFocus(opt.value)}
                      disabled={loading}
                      className={`px-[18px] py-2 rounded-full text-[13px] border-[1.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? "bg-[#FBF0EB] border-tear-primary text-tear-primary font-medium"
                          : "bg-transparent border-[#E8DDD2] text-tear-muted hover:border-tear-primary hover:text-tear-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-[#EDE5DC] -mx-8" />

          {/* Audience tone */}
          <div className="py-7">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-tear-text">Audience tone</p>
                <p className="text-[13px] text-[#A89890] mt-1">Shapes the framing and language of each slide</p>
              </div>
              <div className="flex gap-2.5">
                {TONE_OPTIONS.map((opt) => {
                  const active = config.tone === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setConfig((c) => ({ ...c, tone: opt.value }))}
                      disabled={loading}
                      className={`flex-1 py-2.5 px-3 text-[13px] border-[1.5px] rounded-lg text-center transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? "bg-[#FBF0EB] border-tear-primary text-tear-primary font-medium"
                          : "bg-transparent border-[#E8DDD2] text-tear-muted hover:border-tear-primary hover:text-tear-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="h-px bg-[#EDE5DC] -mx-8" />

          {/* Charts toggle */}
          <div className="pt-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-tear-text">Include auto-generated charts</p>
                <p className="text-[13px] text-[#A89890] mt-1">We&apos;ll produce simple bar and line charts from the data</p>
              </div>
              <button
                onClick={() => setConfig((c) => ({ ...c, charts: !c.charts }))}
                disabled={loading}
                className="w-[42px] h-6 rounded-full relative flex-shrink-0 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: config.charts ? "#C2451E" : "#D1C4BE" }}
              >
                <span
                  className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-all duration-200"
                  style={{ left: config.charts ? "21px" : "3px" }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="w-full max-w-[680px] flex flex-col items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-[17px] bg-tear-primary text-white font-dm-sans text-base font-semibold rounded-[10px] hover:bg-[#A83918] transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 15" />
                </svg>
                Generating… {elapsedSec}s
              </>
            ) : (
              "Generate my deck →"
            )}
          </button>
          {loading && (
            <button
              onClick={handleStop}
              className="w-full py-[13px] border-[1.5px] border-[#E8DDD2] text-tear-muted font-dm-sans text-sm font-medium rounded-[10px] hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
              </svg>
              Stop generation
            </button>
          )}
          <p className="text-[13px] italic text-[#A89890] text-center">
            {loading
              ? elapsedSec < 60
                ? "Usually ready in 60–90 seconds — writing your research into slides…"
                : "Almost there — finalizing slides and building the file…"
              : "Usually ready in 60–90 seconds · Preview slides as they generate"}
          </p>
          {deckData && (
            <button
              onClick={() => router.push(`/deck/${sessionId}/edit`)}
              className="text-[13px] text-tear-muted hover:text-tear-primary transition-colors duration-150 underline underline-offset-2"
            >
              View existing deck instead →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
