-- Extends token_usage into a full operation ledger: every agent action — whether it made a
-- real LLM call ("generate") or was served from research_cache ("cache_reuse") — gets exactly
-- one row here. This is now the single source of truth; session_tokens (aggregate) remains as
-- a fast-lookup rollup but should always be derivable from this table (no more drift between
-- an aggregate that keeps working and a detail ledger that silently doesn't).
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS product_key TEXT;
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS operation TEXT DEFAULT 'generate';
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS section_ids TEXT[];
ALTER TABLE token_usage ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_token_usage_session_id ON token_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_product_key ON token_usage(product_key);
CREATE INDEX IF NOT EXISTS idx_token_usage_agent ON token_usage(agent);
CREATE INDEX IF NOT EXISTS idx_token_usage_operation ON token_usage(operation);
