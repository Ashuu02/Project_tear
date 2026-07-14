import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const EMPTY_RESPONSE = { totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, breakdown: [], calls: [] };

  try {
    // Get session totals
    const { data: totals, error: totalsError } = await supabaseAdmin
      .from("session_tokens")
      .select("total_tokens, total_input_tokens, total_output_tokens")
      .eq("session_id", sessionId)
      .single();

    // This is a best-effort info widget, not a critical path — any schema/query issue here
    // (missing table, missing column from a not-yet-run migration, no rows for this session
    // yet) should degrade to "no data" rather than break the page that's showing it.
    if (totalsError && totalsError.code !== "PGRST116") {
      console.error("[api/tokens] session_tokens query failed, returning empty:", totalsError.message);
      return NextResponse.json(EMPTY_RESPONSE);
    }

    // Every operation this session performed — a real LLM call ("generate") or a section
    // served from cache instead ("cache_reuse", 0 tokens) — so callers can build a full
    // per-action audit trail (which sections were reused vs generated, by which agent, at
    // what cost), not just a per-agent token rollup.
    const { data: breakdown, error: breakdownError } = await supabaseAdmin
      .from("token_usage")
      .select("agent, model, operation, section_ids, duration_ms, input_tokens, output_tokens, total_tokens, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (breakdownError) {
      console.error("[api/tokens] token_usage query failed, returning empty:", breakdownError.message);
      return NextResponse.json(EMPTY_RESPONSE);
    }

    // Aggregate by agent (kept for existing callers of this shape)
    const agentTotals: Record<string, number> = {};
    for (const row of breakdown ?? []) {
      agentTotals[row.agent] = (agentTotals[row.agent] ?? 0) + (row.total_tokens ?? 0);
    }

    const breakdownArray = Object.entries(agentTotals).map(([agent, tokens]) => ({
      agent,
      tokens,
    }));

    const rows = breakdown ?? [];
    const reusedSections = rows.filter((r) => r.operation === "cache_reuse").flatMap((r) => r.section_ids ?? []);
    const generatedSections = rows.filter((r) => r.operation === "generate" && r.section_ids?.length).flatMap((r) => r.section_ids ?? []);

    return NextResponse.json({
      totalTokens: totals?.total_tokens ?? 0,
      totalInputTokens: totals?.total_input_tokens ?? 0,
      totalOutputTokens: totals?.total_output_tokens ?? 0,
      breakdown: breakdownArray,
      calls: rows.map((row) => ({
        agent: row.agent,
        model: row.model,
        operation: row.operation,
        sectionIds: row.section_ids,
        durationMs: row.duration_ms,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        totalTokens: row.total_tokens,
        createdAt: row.created_at,
      })),
      cache: {
        reusedSections,
        generatedSections,
        reuseRate: reusedSections.length + generatedSections.length > 0
          ? reusedSections.length / (reusedSections.length + generatedSections.length)
          : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
