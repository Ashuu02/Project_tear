-- Initial schema for Tear — AI-powered product teardown platform
-- All tables are session-scoped. RLS enabled on all tables.

CREATE TABLE IF NOT EXISTS public.sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name    text        NOT NULL,
  product_metadata jsonb,
  tier1_answers   jsonb,
  tier2_answers   jsonb,
  status          text        DEFAULT 'pending',
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teardown_research (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        REFERENCES public.sessions(id),
  section_key text        NOT NULL,
  content     text,
  created_at  timestamptz DEFAULT now()
);

-- Stores raw crawler chunks indexed per session (url, source, confidence)
CREATE TABLE IF NOT EXISTS public.teardown_qa (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid        REFERENCES public.sessions(id),
  url              text,
  source_type      text,
  raw_chunk        text,
  confidence_score float8,
  date_accessed    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teardown_pptx (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        REFERENCES public.sessions(id),
  config_json jsonb,
  file_path   text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        REFERENCES public.sessions(id),
  agent_name  text,
  step        text,
  status      text,
  message     text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teardown_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teardown_qa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teardown_pptx     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs        ENABLE ROW LEVEL SECURITY;
