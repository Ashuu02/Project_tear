import { supabaseAdmin } from "@/lib/supabase";
import type { ResearchDoc, DeckData } from "@/types/teardown";

/**
 * Best-effort admin-visibility logging. Never throws — a failure here must
 * not break the user-facing pipeline (same convention as tokenTracker.ts).
 */

export async function recordTeardownStart(
  sessionId: string,
  productName: string,
  category: string,
  selectedModel: string,
  tier1Answers: unknown,
  tier2Answers: unknown
): Promise<void> {
  try {
    await supabaseAdmin.from("admin_teardowns").upsert(
      {
        session_id: sessionId,
        product_name: productName,
        category,
        selected_model: selectedModel,
        status: "pending",
        tier1_answers: tier1Answers,
        tier2_answers: tier2Answers,
      },
      { onConflict: "session_id" }
    );
  } catch (err) {
    console.error("[adminTeardowns] Failed to record teardown start:", err);
  }
}

export async function recordTeardownComplete(
  sessionId: string,
  researchDoc: ResearchDoc,
  sourcesCount: number
): Promise<void> {
  try {
    await supabaseAdmin
      .from("admin_teardowns")
      .update({
        status: "complete",
        research_doc: researchDoc,
        sources_count: sourcesCount,
        completed_at: new Date().toISOString(),
      })
      .eq("session_id", sessionId);
  } catch (err) {
    console.error("[adminTeardowns] Failed to record teardown completion:", err);
  }
}

export async function recordTeardownError(sessionId: string, message: string): Promise<void> {
  try {
    await supabaseAdmin
      .from("admin_teardowns")
      .update({ status: "error", error_message: message })
      .eq("session_id", sessionId);
  } catch (err) {
    console.error("[adminTeardowns] Failed to record teardown error:", err);
  }
}

export async function recordDeckData(sessionId: string, deckData: DeckData): Promise<void> {
  try {
    await supabaseAdmin.from("admin_teardowns").update({ deck_data: deckData }).eq("session_id", sessionId);
  } catch (err) {
    console.error("[adminTeardowns] Failed to record deck data:", err);
  }
}

const PPTX_BUCKET = "teardown-pptx";

export async function uploadPptxFile(
  sessionId: string,
  productName: string,
  buffer: ArrayBuffer
): Promise<void> {
  try {
    const slug = productName.replace(/\s+/g, "-").toLowerCase();
    const fileName = `${slug}-teardown.pptx`;
    const filePath = `${sessionId}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(PPTX_BUCKET)
      .upload(filePath, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: true,
      });

    if (uploadError) {
      if (uploadError.message?.toLowerCase().includes("bucket not found")) {
        await supabaseAdmin.storage.createBucket(PPTX_BUCKET, { public: false });
        await supabaseAdmin.storage.from(PPTX_BUCKET).upload(filePath, buffer, {
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          upsert: true,
        });
      } else {
        throw uploadError;
      }
    }

    await supabaseAdmin.from("teardown_pptx_files").upsert(
      { session_id: sessionId, file_name: fileName, file_path: filePath },
      { onConflict: "session_id" }
    );
  } catch (err) {
    console.error("[adminTeardowns] Failed to upload pptx file:", err);
  }
}

export { PPTX_BUCKET };
