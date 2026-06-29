import { supabaseAdmin } from "@/lib/supabase";

/**
 * Tracks token usage per session in Supabase.
 * Inserts a row into token_usage and upserts running totals in session_tokens.
 */
export async function trackTokens(
  sessionId: string,
  productName: string,
  agent: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined
): Promise<void> {
  const safeInput  = inputTokens  ?? 0;
  const safeOutput = outputTokens ?? 0;
  const totalTokens = safeInput + safeOutput;

  try {
    // Insert individual usage record
    await supabaseAdmin.from("token_usage").insert({
      session_id: sessionId,
      agent,
      input_tokens: safeInput,
      output_tokens: safeOutput,
      total_tokens: totalTokens,
    });

    // Upsert session totals — add to running totals
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
    // Non-fatal — log but don't throw
    console.error("[tokenTracker] Failed to track tokens:", err);
  }
}
