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

-- Every agent action gets exactly one row — a real LLM call ("generate") or a section served
-- from research_cache instead of re-crawled/re-generated ("cache_reuse", 0 tokens). This is the
-- single source of truth for cost/usage; session_tokens below is a fast-lookup rollup of it.
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  model TEXT,
  product_key TEXT,
  operation TEXT DEFAULT 'generate',
  section_ids TEXT[],
  duration_ms INTEGER,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_product_key ON token_usage(product_key);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent ON token_usage(agent);
CREATE INDEX IF NOT EXISTS idx_token_usage_operation ON token_usage(operation);

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

CREATE TABLE IF NOT EXISTS admin_teardowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT,
  selected_model TEXT,
  status TEXT DEFAULT 'pending',
  sources_count INTEGER DEFAULT 0,
  tier1_answers JSONB,
  tier2_answers JSONB,
  research_doc JSONB,
  deck_data JSONB,
  canvas_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teardown_pptx_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Global, product-keyed research reuse cache — see src/lib/researchCache.ts. Sections carry
-- their own sources so reused content stays citable/fact-checkable without re-crawling.
CREATE TABLE IF NOT EXISTS research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT NOT NULL,
  category TEXT,
  section_id TEXT NOT NULL,
  section_data JSONB NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  confidence TEXT,
  reuse_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
  UNIQUE (product_key, section_id)
);

ALTER TABLE admin_teardowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE teardown_pptx_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cache ENABLE ROW LEVEL SECURITY;
