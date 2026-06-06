import { createServerFn } from "@tanstack/react-start";

export const getSpotifyStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conn } = await supabaseAdmin
    .from("spotify_connection")
    .select("display_name, spotify_user_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: playlist } = await supabaseAdmin
    .from("spotify_playlist")
    .select("spotify_playlist_id, name, track_count, total_minutes, last_refreshed_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    connected: !!conn,
    displayName: conn?.display_name as string | undefined,
    playlist: playlist
      ? {
          id: playlist.spotify_playlist_id as string,
          name: playlist.name as string,
          trackCount: playlist.track_count as number,
          totalMinutes: playlist.total_minutes as number,
          lastRefreshedAt: playlist.last_refreshed_at as string | null,
          url: `https://open.spotify.com/playlist/${playlist.spotify_playlist_id}`,
        }
      : null,
  };
});

export const getSpotifyAuthUrl = createServerFn({ method: "POST" })
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ data }) => {
  const { SPOTIFY_SCOPES, encodeSpotifyState, getSpotifyEnv, getRedirectUri } = await import("@/lib/spotify.server");
  const { clientId } = getSpotifyEnv();
  const redirectUri = getRedirectUri(data.origin);
  const state = encodeSpotifyState(redirectUri);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "true",
  });
  return { url: `https://accounts.spotify.com/authorize?${params.toString()}` };
});

export const disconnectSpotify = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("spotify_connection").delete().not("id", "is", null);
  await supabaseAdmin.from("spotify_playlist").delete().not("id", "is", null);
  return { ok: true };
});

interface UpcomingMusicEvent {
  activityId: string;
  artistQuery: string;
  venue: string;
  startsAt: string;
}

async function loadUpcomingMusicEvents(): Promise<UpcomingMusicEvent[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("activities")
    .select("id, title, venue, dates, category")
    .eq("category", "music");
  if (!data) return [];
  const sixMonthsOut = Date.now() + 1000 * 60 * 60 * 24 * 30 * 6;
  const events: UpcomingMusicEvent[] = [];
  for (const row of data) {
    const dates = Array.isArray(row.dates) ? (row.dates as Array<{ startsAt: string; isSoldOut?: boolean }>) : [];
    for (const d of dates) {
      if (d.isSoldOut) continue;
      const t = new Date(d.startsAt).getTime();
      if (Number.isNaN(t) || t < Date.now() || t > sixMonthsOut) continue;
      events.push({
        activityId: row.id as string,
        artistQuery: (row.title as string).split(/[—–-]|@|:|\bat\b/i)[0].trim(),
        venue: (row.venue as string) || "",
        startsAt: d.startsAt,
      });
      break; // earliest upcoming date per activity
    }
  }
  events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return events;
}

export const generateSpotifyPlaylist = createServerFn({ method: "POST" }).handler(async () => {
  const { getValidAccessToken, spotifyFetch } = await import("@/lib/spotify.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const auth = await getValidAccessToken();
  if (!auth) throw new Error("Spotify is not connected.");

  const events = await loadUpcomingMusicEvents();
  if (events.length === 0) {
    return { ok: false, message: "No upcoming music events found." };
  }

  // Look up top tracks per artist, soonest first, until we hit ~3 hours.
  const MAX_MS = 3 * 60 * 60 * 1000;
  const trackUris: string[] = [];
  const seenArtists = new Set<string>();
  let totalMs = 0;

  for (const ev of events) {
    if (totalMs >= MAX_MS) break;
    const q = ev.artistQuery.toLowerCase();
    if (!q || seenArtists.has(q)) continue;
    seenArtists.add(q);
    try {
      const search = await spotifyFetch(
        `/search?q=${encodeURIComponent(ev.artistQuery)}&type=artist&limit=1`,
        auth.token,
      );
      const artist = search?.artists?.items?.[0];
      if (!artist?.id) continue;
      const top = await spotifyFetch(`/artists/${artist.id}/top-tracks?market=US`, auth.token);
      const tracks = (top?.tracks ?? []) as Array<{ uri: string; duration_ms: number }>;
      for (const tr of tracks.slice(0, 3)) {
        if (totalMs + tr.duration_ms > MAX_MS) break;
        trackUris.push(tr.uri);
        totalMs += tr.duration_ms;
      }
    } catch {
      // skip artists we can't resolve
    }
  }

  if (trackUris.length === 0) {
    return { ok: false, message: "No tracks found for upcoming artists." };
  }

  // Find or create the playlist.
  const { data: existing } = await supabaseAdmin
    .from("spotify_playlist")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const playlistName = "NYC Next 6 Months";
  let playlistId = existing?.spotify_playlist_id as string | undefined;

  if (!playlistId) {
    const created = await spotifyFetch(`/users/${auth.spotifyUserId}/playlists`, auth.token, {
      method: "POST",
      body: JSON.stringify({
        name: playlistName,
        description: "Top tracks from artists playing NYC soon. Auto-refreshed weekly.",
        public: false,
      }),
    });
    playlistId = created.id as string;
  }

  // Replace tracks (chunked, 100 per request).
  await spotifyFetch(`/playlists/${playlistId}/tracks`, auth.token, {
    method: "PUT",
    body: JSON.stringify({ uris: trackUris.slice(0, 100) }),
  });
  for (let i = 100; i < trackUris.length; i += 100) {
    await spotifyFetch(`/playlists/${playlistId}/tracks`, auth.token, {
      method: "POST",
      body: JSON.stringify({ uris: trackUris.slice(i, i + 100) }),
    });
  }

  const totalMinutes = Math.round(totalMs / 60000);
  const now = new Date().toISOString();

  if (existing) {
    await supabaseAdmin
      .from("spotify_playlist")
      .update({
        spotify_playlist_id: playlistId,
        name: playlistName,
        track_count: trackUris.length,
        total_minutes: totalMinutes,
        last_refreshed_at: now,
        updated_at: now,
      })
      .eq("id", existing.id as string);
  } else {
    await supabaseAdmin.from("spotify_playlist").insert({
      spotify_playlist_id: playlistId,
      name: playlistName,
      track_count: trackUris.length,
      total_minutes: totalMinutes,
      last_refreshed_at: now,
    });
  }

  return {
    ok: true,
    trackCount: trackUris.length,
    totalMinutes,
    url: `https://open.spotify.com/playlist/${playlistId}`,
  };
});

export const getSpotifyRecommendations = createServerFn({ method: "GET" }).handler(async () => {
  const { getValidAccessToken, spotifyFetch } = await import("@/lib/spotify.server");
  const auth = await getValidAccessToken();
  if (!auth) return { connected: false, matches: [] as Array<{ activityId: string; title: string; venue: string; startsAt: string; reason: string }> };

  // Pull top artists (medium term) + recently-played artists.
  const top = await spotifyFetch(`/me/top/artists?limit=50&time_range=medium_term`, auth.token).catch(() => null);
  const recent = await spotifyFetch(`/me/player/recently-played?limit=50`, auth.token).catch(() => null);

  const liked = new Set<string>();
  const genres = new Set<string>();
  for (const a of (top?.items ?? []) as Array<{ name: string; genres: string[] }>) {
    liked.add(a.name.toLowerCase());
    for (const g of a.genres || []) genres.add(g.toLowerCase());
  }
  for (const item of (recent?.items ?? []) as Array<{ track: { artists: Array<{ name: string }> } }>) {
    for (const a of item.track?.artists ?? []) liked.add(a.name.toLowerCase());
  }

  const events = await loadUpcomingMusicEvents();
  const matches: Array<{ activityId: string; title: string; venue: string; startsAt: string; reason: string }> = [];
  for (const ev of events) {
    const q = ev.artistQuery.toLowerCase();
    if (liked.has(q)) {
      matches.push({ activityId: ev.activityId, title: ev.artistQuery, venue: ev.venue, startsAt: ev.startsAt, reason: "You listen to them" });
    }
  }
  return { connected: true, matches: matches.slice(0, 20) };
});