
-- Monitored URLs: watch any page (with optional focus hint) for new dates.
CREATE TABLE public.monitored_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  last_seen_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (url, hint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_urls TO anon, authenticated;
GRANT ALL ON public.monitored_urls TO service_role;

ALTER TABLE public.monitored_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitored_urls open read" ON public.monitored_urls FOR SELECT USING (true);
CREATE POLICY "monitored_urls open insert" ON public.monitored_urls FOR INSERT WITH CHECK (true);
CREATE POLICY "monitored_urls open update" ON public.monitored_urls FOR UPDATE USING (true);
CREATE POLICY "monitored_urls open delete" ON public.monitored_urls FOR DELETE USING (true);

CREATE TRIGGER trg_monitored_urls_updated_at
BEFORE UPDATE ON public.monitored_urls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Suggestions surfaced when a monitored URL gains new dates.
CREATE TABLE public.monitor_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_url_id UUID NOT NULL REFERENCES public.monitored_urls(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  price_note TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  dismiss_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (monitored_url_id, starts_at)
);

CREATE INDEX idx_monitor_suggestions_status ON public.monitor_suggestions(status, starts_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_suggestions TO anon, authenticated;
GRANT ALL ON public.monitor_suggestions TO service_role;

ALTER TABLE public.monitor_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitor_suggestions open read" ON public.monitor_suggestions FOR SELECT USING (true);
CREATE POLICY "monitor_suggestions open insert" ON public.monitor_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "monitor_suggestions open update" ON public.monitor_suggestions FOR UPDATE USING (true);
CREATE POLICY "monitor_suggestions open delete" ON public.monitor_suggestions FOR DELETE USING (true);
