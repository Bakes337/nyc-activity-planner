
DO $$
DECLARE
  t text;
  p text;
  tables text[] := ARRAY['activities','followed_organizers','monitor_suggestions','monitored_urls','organizer_suggestions','scrape_cache','user_profile'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- drop all existing policies on the table
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
    -- revoke anon, grant authenticated full crud
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all', t);
  END LOOP;
END $$;
