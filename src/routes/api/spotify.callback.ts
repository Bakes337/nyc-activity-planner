import { createFileRoute } from "@tanstack/react-router";

function redirectTo(origin: string, status: "connected" | "error") {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/playlists?spotify=${status}` },
  });
}

export const Route = createFileRoute("/api/spotify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const state = url.searchParams.get("state");
        const origin = `${url.protocol}//${url.host}`;

        if (error || !code) {
          return redirectTo(origin, "error");
        }

        try {
          const { exchangeCodeForToken, getRedirectUri, getRedirectUriFromState, spotifyFetch } = await import("@/lib/spotify.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const redirectUri = getRedirectUriFromState(state) ?? getRedirectUri(origin);
          const token = await exchangeCodeForToken(code, redirectUri);

          const me = await spotifyFetch("/me", token.access_token);
          const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

          const { data: existing } = await supabaseAdmin
            .from("spotify_connection")
            .select("id")
            .limit(1)
            .maybeSingle();

          const payload = {
            spotify_user_id: me.id as string,
            display_name: (me.display_name as string) || (me.id as string),
            access_token: token.access_token,
            refresh_token: token.refresh_token || "",
            expires_at: expiresAt,
            scope: token.scope || "",
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            await supabaseAdmin.from("spotify_connection").update(payload).eq("id", existing.id as string);
          } else {
            await supabaseAdmin.from("spotify_connection").insert(payload);
          }

          return redirectTo(origin, "connected");
        } catch (e) {
          console.error("[spotify callback]", e);
          return redirectTo(origin, "error");
        }
      },
    },
  },
});