import { supabaseAdmin } from "@/lib/supabase";
import { normalizeProductKey } from "@/lib/researchCache";

export type OperationType = "generate" | "cache_reuse" | "cache_write";

export interface TrackTokensOptions {
  /** "generate" (default) for a real LLM call; "cache_write" if this call also seeded the cache. */
  operation?: OperationType;
  /** Which canonical section(s) this specific call covered — omit for session-level agents
   *  (question_agent, crawler_agent, deck_agent) that aren't scoped to individual sections. */
  sectionIds?: string[];
  /** Wall-clock time the call took, for spotting slow operations later. */
  durationMs?: number;
}

/**
 * Logs one row per agent operation — the single source of truth for usage/cost. The
 * session_tokens aggregate is a fast-lookup rollup derived from this table; it is only updated
 * when the detail row above it actually wrote successfully. Previously these were two
 * independent writes, and the aggregate kept "working" (it doesn't need the same columns) even
 * while the detail write silently failed after a schema change — producing a session that
 * showed a real total but zero rows to explain it. Coupling them here makes that drift
 * impossible: either both are accurate, or neither pretends to be.
 */
export async function trackTokens(
  sessionId: string,
  productName: string,
  agent: string,
  model: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
  options?: TrackTokensOptions
): Promise<void> {
  const safeInput = inputTokens ?? 0;
  const safeOutput = outputTokens ?? 0;
  const totalTokens = safeInput + safeOutput;
  const productKey = normalizeProductKey(productName);
  const operation = options?.operation ?? "generate";

  const { error: insertError } = await supabaseAdmin.from("token_usage").insert({
    session_id: sessionId,
    agent,
    model,
    product_key: productKey,
    operation,
    section_ids: options?.sectionIds ?? null,
    duration_ms: options?.durationMs ?? null,
    input_tokens: safeInput,
    output_tokens: safeOutput,
    total_tokens: totalTokens,
  });

  if (insertError) {
    console.error(
      `[tokenTracker] Failed to log ${agent}/${operation} for session ${sessionId} — aggregate NOT updated to avoid drift:`,
      insertError.message
    );
    return;
  }

  try {
    const { data: existing } = await supabaseAdmin
      .from("session_tokens")
      .select("total_input_tokens, total_output_tokens, total_tokens")
      .eq("session_id", sessionId)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("session_tokens")
        .update({
          product_name: productName,
          total_input_tokens: (existing.total_input_tokens ?? 0) + safeInput,
          total_output_tokens: (existing.total_output_tokens ?? 0) + safeOutput,
          total_tokens: (existing.total_tokens ?? 0) + totalTokens,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);
    } else {
      await supabaseAdmin.from("session_tokens").insert({
        session_id: sessionId,
        product_name: productName,
        total_input_tokens: safeInput,
        total_output_tokens: safeOutput,
        total_tokens: totalTokens,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    // The detail row is already safely written at this point — losing the aggregate rollup is
    // recoverable (it can be recomputed from token_usage), so this alone doesn't need to
    // suppress anything upstream. Still logged so it's not invisible.
    console.error("[tokenTracker] Failed to update session_tokens aggregate:", err);
  }
}

/**
 * Logs a zero-cost row for each section served from research_cache instead of re-crawled or
 * re-generated — this is what makes "how much was reused" a precise, queryable fact per session
 * instead of only a global counter on research_cache (which can't tell you which specific
 * session benefited from a given reuse).
 */
export async function trackCacheReuse(
  sessionId: string,
  productName: string,
  agent: string,
  sectionIds: string[]
): Promise<void> {
  if (sectionIds.length === 0) return;
  const productKey = normalizeProductKey(productName);

  const rows = sectionIds.map((sectionId) => ({
    session_id: sessionId,
    agent,
    model: null,
    product_key: productKey,
    operation: "cache_reuse" as const,
    section_ids: [sectionId],
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  }));

  const { error } = await supabaseAdmin.from("token_usage").insert(rows);
  if (error) {
    console.error(`[tokenTracker] Failed to log cache reuse for session ${sessionId}:`, error.message);
  }
}
