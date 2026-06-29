import { supabaseAdmin } from "@/lib/supabase";

/**
 * Attempts to verify that the required tables exist.
 * The actual CREATE TABLE statements must be run via Supabase SQL Editor or a migration tool,
 * since PostgREST doesn't allow arbitrary DDL through the REST API.
 *
 * This function checks for table existence by querying each table,
 * and returns the status for each.
 */
export async function runMigrations(): Promise<{ success: boolean; message: string; tables: Record<string, boolean> }> {
  const tables: Record<string, boolean> = {
    question_bank: false,
    token_usage: false,
    session_tokens: false,
  };

  const createSQL = `
-- Run this SQL in your Supabase SQL Editor to create the required tables:

CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id TEXT UNIQUE NOT NULL,
  dimension TEXT NOT NULL,
  label TEXT NOT NULL,
  sub TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  refresh_score FLOAT DEFAULT 1.0,
  source TEXT DEFAULT 'static',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_tokens (
  session_id TEXT PRIMARY KEY,
  product_name TEXT,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  extracted_text TEXT,
  valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

  // Check each table by attempting a select
  const checks = await Promise.allSettled([
    supabaseAdmin.from("question_bank").select("id").limit(1),
    supabaseAdmin.from("token_usage").select("id").limit(1),
    supabaseAdmin.from("session_tokens").select("session_id").limit(1),
    supabaseAdmin.from("uploaded_files").select("id").limit(1),
  ]);

  const tableNames = ["question_bank", "token_usage", "session_tokens", "uploaded_files"] as const;
  let allExist = true;

  for (let i = 0; i < checks.length; i++) {
    const result = checks[i];
    const tableName = tableNames[i];
    if (result.status === "fulfilled" && !result.value.error) {
      tables[tableName] = true;
    } else {
      allExist = false;
    }
  }

  if (allExist) {
    return {
      success: true,
      message: "All tables exist and are accessible.",
      tables,
    };
  }

  const missingTables = Object.entries(tables)
    .filter(([, exists]) => !exists)
    .map(([name]) => name);

  return {
    success: false,
    message: `Missing tables: ${missingTables.join(", ")}. Run the SQL below in your Supabase SQL Editor:\n\n${createSQL}`,
    tables,
  };
}
