ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS done_at timestamptz,
  ADD COLUMN IF NOT EXISTS rating smallint,
  ADD COLUMN IF NOT EXISTS rating_notes text;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_rating_range CHECK (rating IS NULL OR (rating BETWEEN 1 AND 4));

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS show_sold_out boolean NOT NULL DEFAULT false;

CREATE TABLE public.activity_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  activity_title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  neighborhood text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
  notes text,
  done_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_ratings TO authenticated;
GRANT ALL ON public.activity_ratings TO service_role;

ALTER TABLE public.activity_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY activity_ratings_authenticated_all ON public.activity_ratings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER activity_ratings_set_updated_at
  BEFORE UPDATE ON public.activity_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_activity_ratings_activity ON public.activity_ratings(activity_id);