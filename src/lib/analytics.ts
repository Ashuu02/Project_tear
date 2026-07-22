import { supabaseAdmin } from "./supabase";

export async function logPipelineEvent(
  eventName: string,
  sessionId: string,
  properties?: Record<string, unknown>
) {
  try {
    await supabaseAdmin.from("analytics_events").insert({
      event_name: eventName,
      session_id: sessionId,
      properties: properties ?? {},
    });
  } catch {
    // fail-open — never block the pipeline
  }
}
