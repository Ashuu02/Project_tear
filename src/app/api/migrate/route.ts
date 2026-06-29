import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/migrations";

export async function POST() {
  try {
    const result = await runMigrations();
    // Always return 200 — caller reads result.success to check status
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
