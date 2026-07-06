-- Admin visibility: one row per teardown session, plus the pptx file registry.
-- session_id is TEXT (client-generated crypto.randomUUID()), matching the
-- existing token_usage / session_tokens convention — not a FK to `sessions`,
-- since that table is not currently written to by the app.

CREATE TABLE IF NOT EXISTS admin_teardowns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     TEXT NOT NULL UNIQUE,
  product_name   TEXT NOT NULL,
  category       TEXT,
  selected_model TEXT,
  status         TEXT DEFAULT 'pending',
  sources_count  INTEGER DEFAULT 0,
  tier1_answers  JSONB,
  tier2_answers  JSONB,
  research_doc   JSONB,
  deck_data      JSONB,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teardown_pptx_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL UNIQUE,
  file_name   TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Only the service-role key (server-side supabaseAdmin) may read/write these —
-- lock out the anon/public key entirely by enabling RLS with no policies.
ALTER TABLE admin_teardowns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teardown_pptx_files  ENABLE ROW LEVEL SECURITY;
