
CREATE TABLE public.spotify_connection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_user_id text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotify_connection TO authenticated;
GRANT ALL ON public.spotify_connection TO service_role;
ALTER TABLE public.spotify_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY spotify_connection_authenticated_all ON public.spotify_connection FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.spotify_playlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_playlist_id text NOT NULL,
  name text NOT NULL DEFAULT 'NYC Next 6 Months',
  track_count integer NOT NULL DEFAULT 0,
  total_minutes integer NOT NULL DEFAULT 0,
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotify_playlist TO authenticated;
GRANT ALL ON public.spotify_playlist TO service_role;
ALTER TABLE public.spotify_playlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY spotify_playlist_authenticated_all ON public.spotify_playlist FOR ALL TO authenticated USING (true) WITH CHECK (true);
