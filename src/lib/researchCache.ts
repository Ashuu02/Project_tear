import { supabaseAdmin } from "@/lib/supabase";
import type { ResearchDoc, ResearchSection, TeardownSource } from "@/types/teardown";

// How long a cached section stays reusable. Deliberately a single constant rather than
// per-category tuning (e.g. pricing data going stale faster than tech-stack data) — this
// codebase has no subcategory taxonomy to hang that on yet; a reasonable future refinement.
// Two layers enforce this, not just the live-computed score below: `expires_at` is a hard
// SQL-level cutoff (a row past it is never returned, full stop, regardless of any app-level
// scoring bug) — the retention window a teardown platform can defend to users. The refresh
// score is a *softer* in-window preference that decays reuse likelihood well before that hard
// cutoff, since data from day 89 shouldn't be treated identically to data from day 1.
const STALE_AFTER_DAYS = 90;
const REUSE_THRESHOLD = 0.4;
const TTL_DAYS = 90;

export function normalizeProductKey(name: string): string {
  return name.trim().toLowerCase();
}

export interface CachedSectionEntry {
  section: ResearchSection;
  sources: TeardownSource[];
}

// Resolves which sources back each section, for writing into the cache. Docs generated after
// the citation rework carry real per-section `sourceNums`; older docs (from before that
// existed — e.g. historical admin_teardowns rows being backfilled) have none, so this falls
// back to the same `usedIn`-text matching the live pipeline's reconciliation step uses.
export function resolveSourcesBySection(doc: ResearchDoc): Record<string, TeardownSource[]> {
  const bySection: Record<string, TeardownSource[]> = {};
  const hasSourceNums = doc.sections.some((s) => (s.sourceNums?.length ?? 0) > 0);

  if (hasSourceNums) {
    for (const s of doc.sections) {
      bySection[s.id] = (s.sourceNums ?? [])
        .map((n) => doc.sources.find((src) => src.num === n))
        .filter((src): src is TeardownSource => !!src);
    }
    return bySection;
  }

  for (const s of doc.sections) bySection[s.id] = [];
  for (const src of doc.sources) {
    const usedInLower = (src.usedIn ?? "").toLowerCase();
    const match = doc.sections.find(
      (s) => usedInLower && (usedInLower.includes(s.title.toLowerCase()) || s.title.toLowerCase().includes(usedInLower))
    );
    if (match) bySection[match.id].push(src);
  }
  return bySection;
}

function computeRefreshScore(updatedAt: string): number {
  const ageDays = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / STALE_AFTER_DAYS);
}

// Reads every cached section for a product and returns only the ones still fresh enough to
// reuse (refresh score computed live from age — no cron/decay job needed). The `expires_at`
// filter is a hard cutoff enforced at the query level, not just in the score math below — a
// row past its TTL is never even fetched, so stale data can't leak through a scoring bug.
// Fail-open: any read error just means nothing gets reused this run, never a hard failure.
export async function getCachedSections(productKey: string): Promise<Record<string, CachedSectionEntry>> {
  try {
    const { data, error } = await supabaseAdmin
      .from("research_cache")
      .select("section_id, section_data, sources, updated_at")
      .eq("product_key", productKey)
      .gt("expires_at", new Date().toISOString());
    if (error || !data) return {};

    const result: Record<string, CachedSectionEntry> = {};
    for (const row of data) {
      if (computeRefreshScore(row.updated_at) < REUSE_THRESHOLD) continue;
      result[row.section_id] = {
        section: row.section_data as ResearchSection,
        sources: (row.sources ?? []) as TeardownSource[],
      };
    }
    return result;
  } catch (err) {
    console.error("[researchCache] Failed to read cache:", err);
    return {};
  }
}

// Upserts freshly-generated sections back into the cache, each carrying its own resolved
// sources — this is what lets a reused section stay citable and fact-checkable without ever
// re-crawling. Fail-open: caching failure must never break the generation that produced it.
export async function saveCachedSections(
  productKey: string,
  category: string | undefined,
  sections: ResearchSection[],
  sourcesBySectionId: Record<string, TeardownSource[]>
): Promise<void> {
  if (sections.length === 0) return;
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TTL_DAYS * 24 * 60 * 60 * 1000);
    const rows = sections.map((s) => ({
      product_key: productKey,
      category: category || null,
      section_id: s.id,
      section_data: s,
      sources: sourcesBySectionId[s.id] ?? [],
      confidence: s.confidence ?? null,
      updated_at: now.toISOString(),
      // Set explicitly (not just relying on the column DEFAULT) because upsert performs an
      // UPDATE for existing rows, and DEFAULT only applies to a fresh INSERT — without this,
      // a re-saved section would keep its original, now-stale expiry.
      expires_at: expiresAt.toISOString(),
    }));
    await supabaseAdmin.from("research_cache").upsert(rows, { onConflict: "product_key,section_id" });
  } catch (err) {
    console.error("[researchCache] Failed to save cache:", err);
  }
}

// Best-effort popularity counter — read-modify-write is fine here since it's informational,
// not correctness-critical (worst case under a race is an undercount, never wrong content).
export async function bumpReuseCount(productKey: string, sectionIds: string[]): Promise<void> {
  if (sectionIds.length === 0) return;
  try {
    for (const sectionId of sectionIds) {
      const { data } = await supabaseAdmin
        .from("research_cache")
        .select("reuse_count")
        .eq("product_key", productKey)
        .eq("section_id", sectionId)
        .maybeSingle();
      if (data) {
        await supabaseAdmin
          .from("research_cache")
          .update({ reuse_count: (data.reuse_count ?? 0) + 1 })
          .eq("product_key", productKey)
          .eq("section_id", sectionId);
      }
    }
  } catch (err) {
    console.error("[researchCache] Failed to bump reuse count:", err);
  }
}
