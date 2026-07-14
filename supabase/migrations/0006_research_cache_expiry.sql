ALTER TABLE research_cache ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days');

-- Backfill existing rows (added before this column existed) so they don't read as NULL/expired.
UPDATE research_cache SET expires_at = updated_at + INTERVAL '90 days' WHERE expires_at IS NULL;
