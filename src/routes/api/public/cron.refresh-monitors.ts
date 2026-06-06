import { createFileRoute } from "@tanstack/react-router";
import { refreshAllMonitoredUrlsImpl } from "@/lib/monitors.functions";
import { refreshAllMonitoredActivitiesImpl } from "@/lib/activities.functions";

// Weekly cron — called by pg_cron. Authenticated via the Supabase publishable
// (anon) key in the `apikey` header, validated server-side here.
function isAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!expected) return false;
  const provided =
    request.headers.get("apikey") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!provided || provided.length !== expected.length) return false;
  // constant-time-ish comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export const Route = createFileRoute("/api/public/cron/refresh-monitors")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        isAuthorized(request) ? runRefresh() : new Response("Unauthorized", { status: 401 }),
      GET: async ({ request }) =>
        isAuthorized(request) ? runRefresh() : new Response("Unauthorized", { status: 401 }),
    },
  },
});

async function runRefresh() {
  const [monitoredUrls, monitoredActivities] = await Promise.allSettled([
    refreshAllMonitoredUrlsImpl(),
    refreshAllMonitoredActivitiesImpl(),
  ]);
  return Response.json({
    ok: true,
    monitoredUrls:
      monitoredUrls.status === "fulfilled"
        ? monitoredUrls.value
        : { error: String(monitoredUrls.reason) },
    monitoredActivities:
      monitoredActivities.status === "fulfilled"
        ? monitoredActivities.value
        : { error: String(monitoredActivities.reason) },
  });
}