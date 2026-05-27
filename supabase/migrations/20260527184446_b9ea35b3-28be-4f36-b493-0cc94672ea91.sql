
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'refresh-followed-organizers',
  '17 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--1c3fa34b-2738-4fbf-a707-d092a9966be7.lovable.app/api/public/cron/refresh-organizers',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhb2dtY2ZxbG1lamRkZHhxdmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4OTIxNDMsImV4cCI6MjA5NTQ2ODE0M30.qQ-Xba8snE1SzXMgBFpFQEgeJZZmfJ_51TR9gO7KL84"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
