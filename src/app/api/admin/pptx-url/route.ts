import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";
import { PPTX_BUCKET } from "@/lib/adminTeardowns";

export async function GET(req: NextRequest) {
  if (!isValidAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const { data: row, error } = await supabaseAdmin
    .from("teardown_pptx_files")
    .select("file_path")
    .eq("session_id", sessionId)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(PPTX_BUCKET)
    .createSignedUrl(row.file_path, 300);

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Failed to sign URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
