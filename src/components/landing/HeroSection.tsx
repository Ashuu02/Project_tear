"use client";

import { useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session";

const EXAMPLES = ["Notion", "Apple Vision Pro", "Shopify checkout flow"];

export default function HeroSection() {
  const router = useRouter();
  const { setProductName } = useSessionStore();
  const [value, setValue] = useState("");

  function handleStart() {
    const trimmed = value.trim();
    if (!trimmed) return;
    setProductName(trimmed);
    router.push("/intake");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleStart();
  }

  function handleChipClick(chip: string) {
    setValue(chip);
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 pt-12 w-full max-w-[760px] mx-auto">
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-9 animate-fade-up-1">
        <div className="w-1.5 h-1.5 rounded-full bg-tear-primary" />
        <span className="text-xs font-medium text-tear-primary uppercase tracking-[0.12em]">
          AI-powered product research
        </span>
      </div>

      {/* Headline */}
      <h1 className="font-lora text-[clamp(38px,5.5vw,58px)] font-medium leading-[1.18] text-center text-tear-text tracking-[-0.02em] mb-6 max-w-[680px] animate-fade-up-2">
        Understand any product deeply&nbsp;— in minutes.
      </h1>

      {/* Subtext */}
      <p className="text-[17px] font-light leading-[1.65] text-center text-tear-muted max-w-[560px] mb-13 animate-fade-up-3">
        AI agents crawl dozens of sources and assemble a citation-backed
        teardown — so you walk in knowing the product better than most people
        who work on it.
      </p>

      {/* Input + CTA + chips */}
      <div className="w-full max-w-[640px] flex flex-col items-center gap-4 animate-fade-up-4">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What product do you want to tear down? Try Notion, Figma, Shopify..."
          className="w-full px-6 py-[18px] text-base font-normal text-tear-text bg-white border-[1.5px] border-tear-border rounded-[10px] placeholder:text-tear-chip transition-[border-color,box-shadow] duration-200 focus:outline-none focus:border-tear-primary focus:shadow-[0_0_0_3px_rgba(194,69,30,0.10)]"
        />

        <button
          onClick={handleStart}
          className="px-9 py-4 bg-tear-primary hover:bg-tear-primary-dark text-white text-base font-medium tracking-wide rounded-lg transition-colors duration-200 cursor-pointer"
        >
          Build my teardown →
        </button>

        {/* Example chips */}
        <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
          {EXAMPLES.map((chip, i) => (
            <>
              {i > 0 && (
                <span key={`dot-${i}`} className="text-tear-chip-border text-sm">·</span>
              )}
              <span
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="text-[13px] text-tear-chip hover:text-tear-primary transition-colors duration-150 cursor-pointer"
              >
                {chip}
              </span>
            </>
          ))}
        </div>
      </div>
    </main>
  );
}
