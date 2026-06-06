import { createFileRoute } from "@tanstack/react-router";
import { refreshAllMonitoredUrls } from "@/lib/monitors.functions";
import { refreshAllMonitoredActivities } from "@/lib/activities.functions";

// Weekly cron — called by pg_cron. Public route; security is the secret URL
// plus the Lovable Cloud anon key in the apikey header.
export const Route = createFileRoute("/api/public/cron/refresh-monitors")({
  server: {
    handlers: {
      POST: async () => runRefresh(),
      GET: async () => runRefresh(),
    },
  },
});

async function runRefresh() {
  const [monitoredUrls, monitoredActivities] = await Promise.allSettled([
    refreshAllMonitoredUrls(),
    refreshAllMonitoredActivities(),
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