import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // All token_usage rows — every agent operation, real LLM calls and zero-cost cache reuses
    // alike, keyed all the way down to session/product/agent/section.
    const { data: usageRows, error: usageErr } = await supabaseAdmin
      .from("token_usage")
      .select("agent, model, product_key, operation, section_ids, input_tokens, output_tokens, total_tokens, created_at")
      .order("created_at", { ascending: false });

    // Best-effort dashboard, not a critical path — any schema/query issue (missing table,
    // missing column from a not-yet-run migration) should degrade to "no data" rather than
    // 500 the whole page.
    if (usageErr) {
      console.error("[api/tokenmaster] token_usage query failed, returning empty:", usageErr.message);
      return NextResponse.json({ totals: null, byAgent: [], sessions: [], sessionCount: 0 });
    }

    // Session summaries
    const { data: sessionRows, error: sessionErr } = await supabaseAdmin
      .from("session_tokens")
      .select("session_id, product_name, total_input_tokens, total_output_tokens, total_tokens, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (sessionErr && sessionErr.code !== "PGRST116") {
      console.error("[api/tokenmaster] session_tokens query failed, continuing without it:", sessionErr.message);
    }

    // Aggregate by (agent, model) — a given agent can run under different providers across
    // sessions (user-selectable per request), so grouping by agent name alone would blend
    // token counts from different models together and make cost estimation unreliable.
    // Cache-reuse rows (model=null, 0 tokens) are excluded from this — they're not billable
    // model usage, they belong in the cache-efficiency summary below instead.
    const agentMap: Record<string, { agent: string; model: string; input: number; output: number; total: number; calls: number }> = {};
    let grandInput = 0, grandOutput = 0, grandTotal = 0;

    const generateRows = (usageRows ?? []).filter((r) => r.operation !== "cache_reuse");
    for (const row of generateRows) {
      const agent = row.agent ?? "unknown";
      const model = row.model ?? "unknown";
      const key = `${agent}::${model}`;
      if (!agentMap[key]) agentMap[key] = { agent, model, input: 0, output: 0, total: 0, calls: 0 };
      agentMap[key].input  += row.input_tokens  ?? 0;
      agentMap[key].output += row.output_tokens ?? 0;
      agentMap[key].total  += row.total_tokens  ?? 0;
      agentMap[key].calls  += 1;
      grandInput  += row.input_tokens  ?? 0;
      grandOutput += row.output_tokens ?? 0;
      grandTotal  += row.total_tokens  ?? 0;
    }

    const byAgent = Object.values(agentMap);

    // Cache efficiency per product — how much of each product's research has been reused
    // vs. freshly generated, across every session that's ever touched it.
    const productMap: Record<string, { productKey: string; reused: number; generated: number }> = {};
    for (const row of usageRows ?? []) {
      const productKey = row.product_key;
      if (!productKey || !row.section_ids?.length) continue;
      if (!productMap[productKey]) productMap[productKey] = { productKey, reused: 0, generated: 0 };
      if (row.operation === "cache_reuse") productMap[productKey].reused += row.section_ids.length;
      else if (row.operation === "generate") productMap[productKey].generated += row.section_ids.length;
    }
    const byProduct = Object.values(productMap).map((p) => ({
      ...p,
      reuseRate: p.reused + p.generated > 0 ? p.reused / (p.reused + p.generated) : 0,
    }));

    return NextResponse.json({
      totals: { input: grandInput, output: grandOutput, total: grandTotal },
      byAgent,
      byProduct,
      sessions: sessionRows ?? [],
      sessionCount: (sessionRows ?? []).length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
