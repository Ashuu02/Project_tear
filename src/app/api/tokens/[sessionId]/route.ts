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

  try {
    // Get session totals
    const { data: totals, error: totalsError } = await supabaseAdmin
      .from("session_tokens")
      .select("total_tokens, total_input_tokens, total_output_tokens")
      .eq("session_id", sessionId)
      .single();

    if (totalsError && totalsError.code !== "PGRST116") {
      // Table may not exist yet — return zero tokens gracefully
      if (totalsError.message?.includes("schema cache") || totalsError.code === "42P01") {
        return NextResponse.json({ totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, breakdown: [] });
      }
      return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    // Get per-agent breakdown, plus every individual call (agent + model + tokens + when) so
    // callers can build a full per-action audit trail, not just a per-agent rollup.
    const { data: breakdown, error: breakdownError } = await supabaseAdmin
      .from("token_usage")
      .select("agent, model, input_tokens, output_tokens, total_tokens, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (breakdownError) {
      // Table may not exist yet — return zero tokens gracefully
      if (breakdownError.message?.includes("schema cache") || breakdownError.code === "42P01") {
        return NextResponse.json({ totalTokens: 0, totalInputTokens: 0, totalOutputTokens: 0, breakdown: [], calls: [] });
      }
      return NextResponse.json({ error: breakdownError.message }, { status: 500 });
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

    return NextResponse.json({
      totalTokens: totals?.total_tokens ?? 0,
      totalInputTokens: totals?.total_input_tokens ?? 0,
      totalOutputTokens: totals?.total_output_tokens ?? 0,
      breakdown: breakdownArray,
      calls: (breakdown ?? []).map((row) => ({
        agent: row.agent,
        model: row.model,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        totalTokens: row.total_tokens,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
