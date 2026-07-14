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
  UNIQUE (product_key, section_id)
);

ALTER TABLE research_cache ENABLE ROW LEVEL SECURITY;
