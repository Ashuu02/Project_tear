"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";
import { PRODUCTS } from "@/data/products";
import { MODEL_META, type ModelProvider } from "@/lib/providers";

const EXAMPLES = ["Notion", "Figma", "Shopify"];
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const MODELS: ModelProvider[] = ["claude", "gemini", "groq"];

function getSuggestions(input: string): string[] {
  if (!input.trim()) return [];
  const lower = input.toLowerCase();
  return PRODUCTS.filter((p) => p.toLowerCase().includes(lower)).slice(0, 8);
}

export default function HeroSection() {
  const router = useRouter();
  const { selectedModel, setSelectedModel, startNewTeardown } = useSessionStore();
  const [value, setValue]           = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const suppressNextSuggest = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (suppressNextSuggest.current) { suppressNextSuggest.current = false; return; }
    setSuggestions(getSuggestions(value));
    setHighlighted(-1);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleStart(name?: string) {
    const trimmed = (name ?? value).trim();
    if (!trimmed) return;
    startNewTeardown(trimmed);
    setSuggestions([]);
    router.push("/intake");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        return;
      }
      if (e.key === "Enter") {
        if (highlighted >= 0) {
          setValue(suggestions[highlighted]);
          setSuggestions([]);
          return;
        }
      }
    }
    if (e.key === "Enter") handleStart();
  }

  function handleSelect(name: string) {
    suppressNextSuggest.current = true;
    setValue(name);
    setSuggestions([]);
  }

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 md:px-6 pb-12 md:pb-20 pt-8 md:pt-12 w-full max-w-[760px] mx-auto">
      {/* Demo mode badge */}
      {DEMO_MODE && (
        <div className="flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-[#FBF0EB] border border-tear-primary/30 rounded-full animate-fade-up-1">
          <div className="w-1.5 h-1.5 rounded-full bg-tear-primary animate-pulse" />
          <span className="text-[11px] font-medium text-tear-primary tracking-wide">Demo mode (no API credits used)</span>
        </div>
      )}

      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-9 animate-fade-up-1">
        <div className="w-1.5 h-1.5 rounded-full bg-tear-primary" />
        <span className="text-xs font-medium text-tear-primary uppercase tracking-[0.12em]">
          AI-powered product research
        </span>
      </div>

      {/* Headline */}
      <h1 className="font-lora text-[clamp(38px,5.5vw,58px)] font-medium leading-[1.18] text-center text-tear-text tracking-[-0.02em] mb-6 max-w-[680px] animate-fade-up-2">
        Understand any product deeply, in minutes.
      </h1>

      {/* Subtext */}
      <p className="text-[17px] font-light leading-[1.65] text-center text-tear-muted max-w-[560px] mb-13 animate-fade-up-3">
        AI agents crawl dozens of sources and assemble a citation-backed
        teardown, so you walk in knowing the product better than most people
        who work on it.
      </p>

      {/* Input + CTA + chips */}
      <div className="w-full max-w-[640px] flex flex-col items-center gap-4 animate-fade-up-4">
        <div ref={containerRef} className="relative w-full">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setSuggestions(getSuggestions(value))}
            placeholder="What product do you want to tear down? Try Notion, Figma, Shopify..."
            className="w-full px-6 py-[18px] text-base font-normal text-tear-text bg-white border-[1.5px] border-tear-border rounded-[10px] placeholder:text-tear-chip transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-tear-primary focus:shadow-[0_0_0_3px_rgba(194,69,30,0.10)]"
          />

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-tear-border rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] overflow-y-auto max-h-60 z-50">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                  className={`w-full text-left px-5 py-3 text-[14px] flex items-center gap-3 transition-colors duration-75 ${
                    i === highlighted
                      ? "bg-[#FBF0EB] text-tear-primary"
                      : "text-tear-text hover:bg-[#F5EFE4]"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-40">
                    <circle cx="6" cy="6" r="4.5" />
                    <path d="M9.5 9.5 13 13" />
                  </svg>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => handleStart()}
          className="w-full md:w-auto px-9 py-4 bg-tear-primary hover:bg-tear-primary-dark text-white text-base font-medium tracking-wide rounded-lg transition-colors duration-200 cursor-pointer"
        >
          Build my teardown →
        </button>

        {/* Model selector */}
        <div className="flex flex-col md:flex-row items-center gap-2">
          <span className="text-[11px] font-medium text-tear-muted uppercase tracking-[0.1em]">AI Model</span>
          <div className="flex items-center flex-wrap justify-center bg-[#F0E8E0] rounded-full p-[3px] gap-[2px]">
            {MODELS.map((m) => {
              const active = selectedModel === m;
              const meta = MODEL_META[m];
              return (
                <button
                  key={m}
                  onClick={() => setSelectedModel(m)}
                  title={meta.sub}
                  className={`relative px-3.5 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-white text-tear-text shadow-sm"
                      : "text-tear-muted hover:text-tear-text"
                  }`}
                >
                  {meta.label}
                  {active && m !== "claude" && (
                    <span className="absolute -top-1.5 -right-1 bg-[#22A05B] text-white text-[8px] font-bold px-1 rounded-full leading-[1.6]">
                      FREE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Example chips */}
        <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
          {EXAMPLES.flatMap((chip, i) =>
            i === 0
              ? [
                  <span key={chip} onClick={() => handleSelect(chip)} className="text-[13px] text-tear-chip hover:text-tear-primary transition-colors duration-150 cursor-pointer">
                    {chip}
                  </span>,
                ]
              : [
                  <span key={`dot-${i}`} className="text-tear-chip-border text-sm">·</span>,
                  <span key={chip} onClick={() => handleSelect(chip)} className="text-[13px] text-tear-chip hover:text-tear-primary transition-colors duration-150 cursor-pointer">
                    {chip}
                  </span>,
                ]
          )}
        </div>
      </div>
    </main>
  );
}
