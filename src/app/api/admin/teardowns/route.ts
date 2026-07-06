import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isValidAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [teardownsRes, tokensRes, pptxRes] = await Promise.all([
    supabaseAdmin.from("admin_teardowns").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("session_tokens").select("session_id, total_input_tokens, total_output_tokens, total_tokens"),
    supabaseAdmin.from("teardown_pptx_files").select("session_id, file_name, file_path, created_at"),
  ]);

  if (teardownsRes.error) {
    return NextResponse.json({ error: teardownsRes.error.message, rows: [] }, { status: 200 });
  }

  const tokensBySession = new Map((tokensRes.data ?? []).map((t) => [t.session_id, t]));
  const pptxBySession = new Map((pptxRes.data ?? []).map((p) => [p.session_id, p]));

  const rows = (teardownsRes.data ?? []).map((t) => {
    const tokens = tokensBySession.get(t.session_id);
    const pptx = pptxBySession.get(t.session_id);
    return {
      sessionId: t.session_id,
      productName: t.product_name,
      category: t.category,
      selectedModel: t.selected_model,
      status: t.status,
      sourcesCount: t.sources_count,
      tier1Answers: t.tier1_answers,
      tier2Answers: t.tier2_answers,
      researchDoc: t.research_doc,
      deckData: t.deck_data,
      errorMessage: t.error_message,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      totalTokens: tokens?.total_tokens ?? 0,
      inputTokens: tokens?.total_input_tokens ?? 0,
      outputTokens: tokens?.total_output_tokens ?? 0,
      pptxFileName: pptx?.file_name ?? null,
      pptxFilePath: pptx?.file_path ?? null,
      pptxCreatedAt: pptx?.created_at ?? null,
    };
  });

  return NextResponse.json({ rows });
}
