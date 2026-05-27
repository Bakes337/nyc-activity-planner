import { createFileRoute } from "@tanstack/react-router";
import { refreshAllOrganizers } from "@/lib/organizers.functions";

// Called by pg_cron on a schedule. Auth is enforced by the Supabase anon key
// passed in the `apikey` header (Lovable Cloud public-api convention).
export const Route = createFileRoute("/api/public/cron/refresh-organizers")({
  server: {
    handlers: {
      POST: async () => {
        const result = await refreshAllOrganizers();
        return Response.json({ ok: true, ...result });
      },
      GET: async () => {
        const result = await refreshAllOrganizers();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});