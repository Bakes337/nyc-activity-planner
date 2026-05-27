
-- Activities
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  borough TEXT NOT NULL DEFAULT 'Manhattan',
  category TEXT NOT NULL DEFAULT 'music',
  price_tier TEXT NOT NULL DEFAULT '$$',
  price_note TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  kind TEXT NOT NULL DEFAULT 'one_time',
  source_url TEXT,
  image_seed TEXT NOT NULL DEFAULT '',
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activities open read"   ON public.activities FOR SELECT USING (true);
CREATE POLICY "activities open insert" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "activities open update" ON public.activities FOR UPDATE USING (true);
CREATE POLICY "activities open delete" ON public.activities FOR DELETE USING (true);

CREATE INDEX activities_category_idx ON public.activities (category);
CREATE INDEX activities_status_idx   ON public.activities (status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER activities_set_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Simple scrape cache so repeat parses are instant
CREATE TABLE public.scrape_cache (
  url TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrape_cache TO anon, authenticated;
GRANT ALL ON public.scrape_cache TO service_role;

ALTER TABLE public.scrape_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scrape_cache open read"   ON public.scrape_cache FOR SELECT USING (true);
CREATE POLICY "scrape_cache open insert" ON public.scrape_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "scrape_cache open update" ON public.scrape_cache FOR UPDATE USING (true);
