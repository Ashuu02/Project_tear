"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Model metadata with free-tier limits ─────────────────────────────────────
const MODELS = [
  {
    key: "claude",
    label: "Claude",
    sub: "Anthropic",
    color: "#C2451E",
    bg: "#FBF0EB",
    border: "#F0C9B8",
    agents: ["question_agent", "crawler_agent", "document_agent"],
    models: [
      { name: "claude-haiku-4-5-20251001", role: "Question + Crawler", tier: "Paid", inputPrice: 0.80, outputPrice: 4.00 },
      { name: "claude-sonnet-4-6",          role: "Document Agent",     tier: "Paid", inputPrice: 3.00, outputPrice: 15.00 },
    ],
    limits: [
      { label: "Context Window", value: "200K tokens" },
      { label: "Rate Limit",     value: "Tier-based" },
      { label: "Pricing",        value: "Pay-per-use" },
    ],
  },
  {
    key: "gemini",
    label: "Gemini Flash",
    sub: "Google AI",
    color: "#1A73E8",
    bg: "#EAF2FF",
    border: "#C5D9F8",
    agents: [],
    models: [
      { name: "gemini-2.0-flash", role: "All agents", tier: "Free", inputPrice: 0, outputPrice: 0 },
    ],
    limits: [
      { label: "RPM (free)",  value: "15 req/min" },
      { label: "TPM (free)",  value: "1,000,000 tok/min" },
      { label: "RPD (free)",  value: "1,500 req/day" },
    ],
  },
  {
    key: "groq",
    label: "Groq / Llama",
    sub: "Meta LLaMA 3.3 70B",
    color: "#7C3AED",
    bg: "#F3EEFF",
    border: "#DDD0F8",
    agents: [],
    models: [
      { name: "llama-3.3-70b-versatile", role: "All agents", tier: "Free", inputPrice: 0, outputPrice: 0 },
    ],
    limits: [
      { label: "TPM (free)",  value: "14,400 tok/min" },
      { label: "RPM (free)",  value: "30 req/min" },
      { label: "RPD (free)",  value: "1,000 req/day" },
    ],
  },
];

// ── Types ────────────────────────────────────────────────────────────────────
// One row per (agent, model) pair — an agent isn't fixed to one model, since the
// provider is chosen per request, so a session can mix Claude/Gemini/Groq across agents.
interface AgentStat { agent: string; model: string; input: number; output: number; total: number; calls: number }
interface Session { session_id: string; product_name: string; total_input_tokens: number; total_output_tokens: number; total_tokens: number; updated_at: string }
interface ApiData {
  totals: { input: number; output: number; total: number } | null;
  byAgent: AgentStat[];
  sessions: Session[];
  sessionCount: number;
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString(); }
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
// Costs from the model actually used for that row, not a static per-agent guess —
// free-tier providers (Gemini/Groq) correctly price at $0 regardless of which agent ran them.
function estimateCost(model: string, input: number, output: number): string {
  const allModels = MODELS.flatMap((m) => m.models);
  const meta = allModels.find((m) => m.name === model);
  if (!meta || meta.tier === "Free") return meta ? "Free" : "—";
  const cost = (input / 1_000_000) * meta.inputPrice + (output / 1_000_000) * meta.outputPrice;
  return cost < 0.001 ? "<$0.001" : `$${cost.toFixed(4)}`;
}
function totalCost(byAgent: AgentStat[]): string {
  const allModels = MODELS.flatMap((m) => m.models);
  let total = 0;
  for (const a of byAgent) {
    const meta = allModels.find((m) => m.name === a.model);
    if (!meta || meta.tier === "Free") continue;
    total += (a.input / 1_000_000) * meta.inputPrice + (a.output / 1_000_000) * meta.outputPrice;
  }
  return total < 0.001 ? "<$0.001" : `$${total.toFixed(4)}`;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TokenMasterPage() {
  const [data, setData]       = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tokenmaster");
      const json = await res.json() as ApiData;
      setData(json);
      setLastUpdated(new Date());
      setCountdown(10);
    } catch {
      // silently retry
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 10 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const totals   = data?.totals;
  const byAgent  = data?.byAgent ?? [];
  const sessions = data?.sessions ?? [];

  return (
    <div className="min-h-screen bg-[#FDFAF6] font-dm-sans text-[#1C1412]">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-10 py-5 border-b border-[#F0E8DF] bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <circle cx="9.5" cy="9.5" r="7" stroke="#C2451E" strokeWidth="1.7" fill="none" />
              <line x1="14.8" y1="14.8" x2="20" y2="20" stroke="#C2451E" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span className="font-lora text-[18px] font-semibold text-[#1C1412]">Tear</span>
          </Link>
          <span className="text-[#D0C5BD]">/</span>
          <span className="text-[14px] font-semibold text-[#C2451E]">Token Master</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[12px] text-[#7C6E68]">Live · refreshes in {countdown}s</span>
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-[#A89890]">Last updated {fmtTime(lastUpdated.toISOString())}</span>
          )}
          <button
            onClick={fetchData}
            className="px-3 py-1.5 text-[12px] font-medium border border-[#E8DDD2] rounded-lg hover:border-[#C2451E] hover:text-[#C2451E] transition-colors"
          >
            Refresh now
          </button>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-8 py-10 flex flex-col gap-10">

        {/* ── Summary strip ── */}
        {loading ? (
          <div className="flex items-center justify-center h-24 text-[13px] text-[#A89890] animate-pulse">Loading token data…</div>
        ) : data?.error ? (
          <div className="px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600">{data.error}</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Tokens Used",   value: fmt(totals?.total ?? 0),  sub: "across all sessions" },
                { label: "Input Tokens",         value: fmt(totals?.input ?? 0),  sub: "prompt tokens" },
                { label: "Output Tokens",        value: fmt(totals?.output ?? 0), sub: "completion tokens" },
                { label: "Estimated Cost (USD)", value: totalCost(byAgent),       sub: "Claude paid usage" },
              ].map((s) => (
                <div key={s.label} className="bg-white border border-[#E8DDD2] rounded-xl px-5 py-4 flex flex-col gap-1 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                  <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#A89890]">{s.label}</span>
                  <span className="text-[26px] font-semibold text-[#1C1412] leading-tight">{s.value}</span>
                  <span className="text-[12px] text-[#7C6E68]">{s.sub}</span>
                </div>
              ))}
            </div>

            {/* ── Model cards ── */}
            <div>
              <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-[#A89890] mb-4">Model Status &amp; Limits</h2>
              <div className="grid grid-cols-3 gap-5">
                {MODELS.map((m) => (
                  <div key={m.key} className="bg-white border border-[#E8DDD2] rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                    {/* Card header */}
                    <div className="px-5 py-4 flex items-center gap-3" style={{ background: m.bg, borderBottom: `1px solid ${m.border}` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: m.color }}>
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
                          <circle cx="10" cy="10" r="8" strokeWidth="0" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: m.color }}>{m.label}</p>
                        <p className="text-[11.5px] text-[#7C6E68]">{m.sub}</p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full" style={{ background: m.color, color: "white" }}>
                        {m.models[0].tier === "Free" ? "FREE" : "PAID"}
                      </span>
                    </div>

                    {/* Models */}
                    <div className="px-5 py-3 flex flex-col gap-2 border-b border-[#F0E8DF]">
                      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-[#A89890]">Models Used</p>
                      {m.models.map((mod) => (
                        <div key={mod.name} className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[12px] font-mono font-medium text-[#1C1412]">{mod.name}</p>
                            <p className="text-[11px] text-[#A89890]">{mod.role}</p>
                          </div>
                          {mod.tier === "Paid" ? (
                            <div className="text-right shrink-0">
                              <p className="text-[11px] text-[#7C6E68]">${mod.inputPrice}/1M in</p>
                              <p className="text-[11px] text-[#7C6E68]">${mod.outputPrice}/1M out</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-medium">Free tier</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Limits */}
                    <div className="px-5 py-3">
                      <p className="text-[10.5px] font-semibold tracking-widest uppercase text-[#A89890] mb-2">Rate Limits</p>
                      <div className="flex flex-col gap-1.5">
                        {m.limits.map((l) => (
                          <div key={l.label} className="flex items-center justify-between">
                            <span className="text-[12px] text-[#7C6E68]">{l.label}</span>
                            <span className="text-[12px] font-medium text-[#1C1412]">{l.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Agent breakdown ── */}
            <div>
              <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-[#A89890] mb-4">Token Breakdown by Agent</h2>
              {byAgent.length === 0 ? (
                <div className="bg-white border border-[#E8DDD2] rounded-xl px-5 py-8 text-center text-[13px] text-[#A89890]">
                  No agent data yet. Run a teardown to start tracking.
                </div>
              ) : (
                <div className="bg-white border border-[#E8DDD2] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#F0E8DF] bg-[#FDFAF6]">
                        {["Agent", "Model", "Calls", "Input Tokens", "Output Tokens", "Total Tokens", "Est. Cost"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold tracking-[0.07em] uppercase text-[#A89890]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byAgent.map((a, i) => (
                        <tr key={`${a.agent}::${a.model}`} className={`border-b border-[#F0E8DF] ${i % 2 === 0 ? "" : "bg-[#FDFAF6]/50"}`}>
                          <td className="px-5 py-3 font-medium text-[#1C1412]">{a.agent}</td>
                          <td className="px-5 py-3 font-mono text-[11.5px] text-[#7C6E68]">{a.model ?? "—"}</td>
                          <td className="px-5 py-3 text-[#7C6E68]">{a.calls}</td>
                          <td className="px-5 py-3">{fmt(a.input)}</td>
                          <td className="px-5 py-3">{fmt(a.output)}</td>
                          <td className="px-5 py-3 font-semibold">{fmt(a.total)}</td>
                          <td className="px-5 py-3 text-[#C2451E] font-medium">{estimateCost(a.model, a.input, a.output)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#FBF0EB] border-t border-[#F0C9B8]">
                        <td className="px-5 py-3 font-semibold text-[#C2451E]" colSpan={3}>Total</td>
                        <td className="px-5 py-3 font-semibold">{fmt(totals?.input ?? 0)}</td>
                        <td className="px-5 py-3 font-semibold">{fmt(totals?.output ?? 0)}</td>
                        <td className="px-5 py-3 font-semibold">{fmt(totals?.total ?? 0)}</td>
                        <td className="px-5 py-3 font-semibold text-[#C2451E]">{totalCost(byAgent)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* ── Recent sessions ── */}
            <div>
              <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-[#A89890] mb-4">
                Recent Sessions ({sessions.length})
              </h2>
              {sessions.length === 0 ? (
                <div className="bg-white border border-[#E8DDD2] rounded-xl px-5 py-8 text-center text-[13px] text-[#A89890]">
                  No session data yet.
                </div>
              ) : (
                <div className="bg-white border border-[#E8DDD2] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-[#F0E8DF] bg-[#FDFAF6]">
                        {["Product", "Session ID", "Input", "Output", "Total", "Last Active"].map((h) => (
                          <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold tracking-[0.07em] uppercase text-[#A89890]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s, i) => (
                        <tr key={s.session_id} className={`border-b border-[#F0E8DF] ${i % 2 === 0 ? "" : "bg-[#FDFAF6]/50"}`}>
                          <td className="px-5 py-3 font-medium text-[#1C1412]">{s.product_name ?? "—"}</td>
                          <td className="px-5 py-3 font-mono text-[11px] text-[#A89890]">{s.session_id.slice(0, 12)}…</td>
                          <td className="px-5 py-3">{fmt(s.total_input_tokens ?? 0)}</td>
                          <td className="px-5 py-3">{fmt(s.total_output_tokens ?? 0)}</td>
                          <td className="px-5 py-3 font-semibold">{fmt(s.total_tokens ?? 0)}</td>
                          <td className="px-5 py-3 text-[#7C6E68]">{s.updated_at ? fmtTime(s.updated_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Footer note ── */}
            <p className="text-[11.5px] text-[#A89890] text-center pb-6">
              Token data sourced from Supabase · <code className="font-mono">token_usage</code> + <code className="font-mono">session_tokens</code> tables · Cost estimates apply to Claude paid usage only · Gemini &amp; Groq are free tier
            </p>
          </>
        )}
      </div>
    </div>
  );
}
