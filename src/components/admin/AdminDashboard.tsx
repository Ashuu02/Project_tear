"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import type { ResearchDoc, DeckData } from "@/types/teardown";

interface TeardownRow {
  sessionId: string;
  productName: string;
  category: string | null;
  selectedModel: string | null;
  status: string;
  sourcesCount: number;
  tier1Answers: unknown;
  tier2Answers: unknown;
  researchDoc: ResearchDoc | null;
  deckData: DeckData | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  pptxFileName: string | null;
  pptxFilePath: string | null;
  pptxCreatedAt: string | null;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    complete: "text-emerald-700 bg-emerald-50 border-emerald-200",
    pending: "text-orange-700 bg-orange-50 border-orange-200",
    error: "text-red-700 bg-red-50 border-red-200",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${styles[status] ?? "text-tear-muted bg-[#EEE8E1] border-tear-border"}`}>
      {status}
    </span>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [rows, setRows] = useState<TeardownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/teardowns")
      .then((r) => {
        if (r.status === 401) {
          router.refresh();
          throw new Error("Unauthorized");
        }
        return r.json();
      })
      .then((data) => setRows(data.rows ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  async function handleDownload(sessionId: string) {
    const res = await fetch(`/api/admin/pptx-url?sessionId=${sessionId}`);
    if (!res.ok) return;
    const { url } = await res.json();
    if (url) window.open(url, "_blank");
  }

  // Seeds research_cache from every already-completed teardown that predates the caching
  // feature (or otherwise never got written back). Idempotent — safe to run more than once.
  async function handleBackfillCache() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/admin/backfill-cache", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Backfill failed");
      setBackfillResult(`Cached ${data.totalSectionsCached} sections across ${data.teardownsProcessed} teardowns.`);
    } catch (e) {
      setBackfillResult(e instanceof Error ? e.message : String(e));
    } finally {
      setBackfilling(false);
    }
  }

  const filtered = rows.filter((r) =>
    search.trim() === "" || r.productName.toLowerCase().includes(search.toLowerCase())
  );

  const totalTokensAll = rows.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0);

  return (
    <div className="min-h-screen bg-tear-bg font-dm-sans text-tear-text px-8 py-8">
      <div className="max-w-[1500px] mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-lora text-[28px] font-semibold text-tear-text">Admin · All teardowns</h1>
            <p className="text-[13px] text-tear-muted mt-1">
              {rows.length} session{rows.length !== 1 ? "s" : ""} · {totalTokensAll.toLocaleString()} tokens used across all users
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 text-sm border-[1.5px] border-tear-border rounded-lg outline-none focus:border-tear-primary bg-white w-56"
            />
            <button
              onClick={handleBackfillCache}
              disabled={backfilling}
              className="px-3.5 py-2 text-[12.5px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150 disabled:opacity-60"
              title="Seed research_cache from every completed teardown that isn't cached yet"
            >
              {backfilling ? "Backfilling…" : "Backfill cache"}
            </button>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 text-[12.5px] font-medium text-tear-muted border-[1.5px] border-tear-border rounded-lg hover:border-tear-primary hover:text-tear-primary transition-colors duration-150"
            >
              Log out
            </button>
          </div>
        </div>

        {backfillResult && <p className="text-[13px] text-tear-primary font-medium">{backfillResult}</p>}
        {loading && <p className="text-sm text-tear-muted">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="border border-tear-border rounded-xl overflow-hidden bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F5EFE4] border-b border-tear-border text-left">
                  <th className="px-4 py-2.5 font-semibold">Product</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold">Model</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Sources</th>
                  <th className="px-4 py-2.5 font-semibold">Tokens (in / out / total)</th>
                  <th className="px-4 py-2.5 font-semibold">PPTX file</th>
                  <th className="px-4 py-2.5 font-semibold">Created</th>
                  <th className="px-4 py-2.5 font-semibold">Completed</th>
                  <th className="px-4 py-2.5 font-semibold">Session ID</th>
                  <th className="px-4 py-2.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <Fragment key={r.sessionId}>
                    <tr className="border-b border-tear-border hover:bg-[#FBF7F0] align-top">
                      <td className="px-4 py-2.5 font-medium">{r.productName}</td>
                      <td className="px-4 py-2.5 text-tear-muted">{r.category || "—"}</td>
                      <td className="px-4 py-2.5 text-tear-muted">{r.selectedModel ?? "—"}</td>
                      <td className="px-4 py-2.5"><StatusPill status={r.status} /></td>
                      <td className="px-4 py-2.5">{r.sourcesCount ?? 0}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">
                        {r.inputTokens.toLocaleString()} / {r.outputTokens.toLocaleString()} / {r.totalTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.pptxFileName ? (
                          <button
                            onClick={() => handleDownload(r.sessionId)}
                            className="text-tear-primary hover:underline text-[12.5px] font-medium"
                          >
                            {r.pptxFileName}
                          </button>
                        ) : (
                          <span className="text-tear-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-tear-muted whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-tear-muted whitespace-nowrap">{r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-tear-muted">{r.sessionId}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => setExpanded(expanded === r.sessionId ? null : r.sessionId)}
                          className="text-[12px] font-medium text-tear-primary hover:underline"
                        >
                          {expanded === r.sessionId ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded === r.sessionId && (
                      <tr className="border-b border-tear-border bg-[#FBF7F0]">
                        <td colSpan={11} className="px-4 py-4">
                          {r.errorMessage && (
                            <p className="text-[12.5px] text-red-600 mb-3">Error: {r.errorMessage}</p>
                          )}
                          {r.researchDoc ? (
                            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto">
                              <div>
                                <p className="text-[12px] font-semibold text-tear-muted uppercase tracking-wide mb-1">
                                  Research doc — {r.researchDoc.sections?.length ?? 0} sections
                                </p>
                                {r.researchDoc.sections?.map((s) => (
                                  <div key={s.id} className="mb-2.5">
                                    <p className="text-[13px] font-semibold text-tear-text">{s.title}</p>
                                    <p className="text-[12.5px] text-tear-text/80 leading-relaxed">{s.content}</p>
                                  </div>
                                ))}
                              </div>
                              {r.researchDoc.sources?.length > 0 && (
                                <div>
                                  <p className="text-[12px] font-semibold text-tear-muted uppercase tracking-wide mb-1">Sources</p>
                                  {r.researchDoc.sources.map((s) => (
                                    <p key={s.num} className="text-[12px] text-tear-muted">[{s.num}] {s.title} — {s.domain}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-[12.5px] text-tear-muted">No research doc saved for this session.</p>
                          )}
                          {r.deckData && (
                            <p className="text-[12px] text-tear-muted mt-3">Deck: {r.deckData.slides?.length ?? 0} slides generated.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-sm text-tear-muted text-center py-10">No teardowns match.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
