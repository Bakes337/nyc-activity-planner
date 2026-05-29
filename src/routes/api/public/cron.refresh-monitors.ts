import { createFileRoute } from "@tanstack/react-router";
import { refreshAllMonitoredUrls } from "@/lib/monitors.functions";

// Weekly cron — called by pg_cron. Public route; security is the secret URL
// plus the Lovable Cloud anon key in the apikey header.
export const Route = createFileRoute("/api/public/cron/refresh-monitors")({
  server: {
    handlers: {
      POST: async () => {
        const result = await refreshAllMonitoredUrls();
        return Response.json({ ok: true, ...result });
      },
      GET: async () => {
        const result = await refreshAllMonitoredUrls();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});