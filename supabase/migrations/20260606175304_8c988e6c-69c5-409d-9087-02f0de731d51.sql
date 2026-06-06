ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS is_monitored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_monitored_at timestamptz;

CREATE INDEX IF NOT EXISTS activities_is_monitored_idx
  ON public.activities (is_monitored)
  WHERE is_monitored = true;