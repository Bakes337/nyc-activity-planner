
CREATE TABLE public.followed_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'eventbrite',
  organizer_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  url text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, organizer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.followed_organizers TO anon, authenticated;
GRANT ALL ON public.followed_organizers TO service_role;
ALTER TABLE public.followed_organizers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followed_organizers open read" ON public.followed_organizers FOR SELECT USING (true);
CREATE POLICY "followed_organizers open insert" ON public.followed_organizers FOR INSERT WITH CHECK (true);
CREATE POLICY "followed_organizers open update" ON public.followed_organizers FOR UPDATE USING (true);
CREATE POLICY "followed_organizers open delete" ON public.followed_organizers FOR DELETE USING (true);

CREATE TABLE public.organizer_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.followed_organizers(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text NOT NULL DEFAULT '',
  neighborhood text NOT NULL DEFAULT '',
  borough text NOT NULL DEFAULT '',
  is_sold_out boolean NOT NULL DEFAULT false,
  image_url text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizer_id, external_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizer_suggestions TO anon, authenticated;
GRANT ALL ON public.organizer_suggestions TO service_role;
ALTER TABLE public.organizer_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizer_suggestions open read" ON public.organizer_suggestions FOR SELECT USING (true);
CREATE POLICY "organizer_suggestions open insert" ON public.organizer_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "organizer_suggestions open update" ON public.organizer_suggestions FOR UPDATE USING (true);
CREATE POLICY "organizer_suggestions open delete" ON public.organizer_suggestions FOR DELETE USING (true);

CREATE INDEX organizer_suggestions_org_idx ON public.organizer_suggestions (organizer_id);
CREATE INDEX organizer_suggestions_status_idx ON public.organizer_suggestions (status);

CREATE TRIGGER followed_organizers_updated
  BEFORE UPDATE ON public.followed_organizers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
