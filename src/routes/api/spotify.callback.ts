import { createFileRoute, redirect } from "@tanstack/react-router";

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
          throw redirect({ to: "/playlists", search: { spotify: "error" } as never });
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

          throw redirect({ to: "/playlists", search: { spotify: "connected" } as never });
        } catch (e) {
          // Re-throw redirects, swallow API errors into the UI.
          if (e && typeof e === "object" && "to" in e) throw e;
          console.error("[spotify callback]", e);
          throw redirect({ to: "/playlists", search: { spotify: "error" } as never });
        }
      },
    },
  },
});