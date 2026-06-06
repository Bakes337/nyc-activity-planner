import { createFileRoute } from "@tanstack/react-router";
import { refreshAllOrganizersImpl } from "@/lib/organizers.functions";

// Called by pg_cron on a schedule. Authenticated via the Supabase publishable
// (anon) key in the `apikey` header, validated server-side here.
function isAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!expected) return false;
  const provided =
    request.headers.get("apikey") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

export const Route = createFileRoute("/api/public/cron/refresh-organizers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        const result = await refreshAllOrganizersImpl();
        return Response.json({ ok: true, ...result });
      },
      GET: async ({ request }) => {
        if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
        const result = await refreshAllOrganizersImpl();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});