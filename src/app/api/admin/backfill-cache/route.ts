import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";
import { normalizeProductKey, saveCachedSections, resolveSourcesBySection } from "@/lib/researchCache";
import { getProductCategory } from "@/lib/productCategory";
import type { ResearchDoc } from "@/types/teardown";

// One-time (repeatable/idempotent) maintenance action: seeds research_cache from every
// already-completed teardown that predates the caching feature (or otherwise never got
// written back — e.g. a session that errored after generation but before cache write-back).
// Safe to re-run any time; upserts just refresh existing rows.
export async function POST(req: NextRequest) {
  if (!isValidAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_teardowns")
    .select("session_id, product_name, category, research_doc")
    .eq("status", "complete")
    .not("research_doc", "is", null)
    .order("created_at", { ascending: true }); // later runs of the same product win on conflict

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ sessionId: string; productName: string; productKey: string; sectionsCached: number }> = [];

  for (const row of data ?? []) {
    const doc = row.research_doc as ResearchDoc | null;
    if (!doc?.sections?.length) continue;

    const productKey = normalizeProductKey(row.product_name);
    const category = row.category ?? getProductCategory(row.product_name);
    await saveCachedSections(productKey, category, doc.sections, resolveSourcesBySection(doc));

    results.push({
      sessionId: row.session_id,
      productName: row.product_name,
      productKey,
      sectionsCached: doc.sections.length,
    });
  }

  return NextResponse.json({
    teardownsProcessed: results.length,
    totalSectionsCached: results.reduce((sum, r) => sum + r.sectionsCached, 0),
    results,
  });
}
