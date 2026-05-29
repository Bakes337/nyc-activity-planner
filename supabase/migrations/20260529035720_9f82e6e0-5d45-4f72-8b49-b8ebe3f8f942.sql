
CREATE TABLE public.user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_address text NOT NULL DEFAULT '',
  home_lat double precision,
  home_lng double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profile TO anon, authenticated;
GRANT ALL ON public.user_profile TO service_role;

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profile open read" ON public.user_profile FOR SELECT USING (true);
CREATE POLICY "user_profile open insert" ON public.user_profile FOR INSERT WITH CHECK (true);
CREATE POLICY "user_profile open update" ON public.user_profile FOR UPDATE USING (true);
CREATE POLICY "user_profile open delete" ON public.user_profile FOR DELETE USING (true);

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS venue_lat double precision,
  ADD COLUMN IF NOT EXISTS venue_lng double precision,
  ADD COLUMN IF NOT EXISTS travel_from_home jsonb;
