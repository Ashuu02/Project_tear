import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    // All token_usage rows
    const { data: usageRows, error: usageErr } = await supabaseAdmin
      .from("token_usage")
      .select("agent, model, input_tokens, output_tokens, total_tokens, created_at")
      .order("created_at", { ascending: false });

    if (usageErr && (usageErr.code === "42P01" || usageErr.message?.includes("schema cache"))) {
      return NextResponse.json({ totals: null, byAgent: [], sessions: [], sessionCount: 0 });
    }
    if (usageErr) return NextResponse.json({ error: usageErr.message }, { status: 500 });

    // Session summaries
    const { data: sessionRows, error: sessionErr } = await supabaseAdmin
      .from("session_tokens")
      .select("session_id, product_name, total_input_tokens, total_output_tokens, total_tokens, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);

    if (sessionErr && sessionErr.code !== "PGRST116" && sessionErr.code !== "42P01") {
      return NextResponse.json({ error: sessionErr.message }, { status: 500 });
    }

    // Aggregate by (agent, model) — a given agent can run under different providers across
    // sessions (user-selectable per request), so grouping by agent name alone would blend
    // token counts from different models together and make cost estimation unreliable.
    const agentMap: Record<string, { agent: string; model: string; input: number; output: number; total: number; calls: number }> = {};
    let grandInput = 0, grandOutput = 0, grandTotal = 0;

    for (const row of usageRows ?? []) {
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

    return NextResponse.json({
      totals: { input: grandInput, output: grandOutput, total: grandTotal },
      byAgent,
      sessions: sessionRows ?? [],
      sessionCount: (sessionRows ?? []).length,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
