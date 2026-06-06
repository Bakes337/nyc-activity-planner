import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import {
  getSpotifyStatus,
  getSpotifyAuthUrl,
  disconnectSpotify,
  generateSpotifyPlaylist,
  getSpotifyRecommendations,
} from "../lib/spotify.functions";

type Search = { spotify?: "connected" | "error" };

export const Route = createFileRoute("/playlists")({
  head: () => ({ meta: [{ title: "Concerts — Activity Planner" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    spotify: s.spotify === "connected" || s.spotify === "error" ? s.spotify : undefined,
  }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const search = useSearch({ from: "/playlists" }) as Search;
  const qc = useQueryClient();
  const statusFn = useServerFn(getSpotifyStatus);
  const authUrlFn = useServerFn(getSpotifyAuthUrl);
  const disconnectFn = useServerFn(disconnectSpotify);
  const generateFn = useServerFn(generateSpotifyPlaylist);
  const recsFn = useServerFn(getSpotifyRecommendations);

  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (search.spotify === "connected") setBanner("Spotify connected.");
    if (search.spotify === "error") setBanner("Couldn't connect Spotify. Try again.");
  }, [search.spotify]);

  const status = useQuery({ queryKey: ["spotify-status"], queryFn: () => statusFn() });
  const recs = useQuery({
    queryKey: ["spotify-recs"],
    queryFn: () => recsFn(),
    enabled: !!status.data?.connected,
  });

  const connect = useMutation({
    mutationFn: () => authUrlFn(),
    onSuccess: (d) => {
      if (d?.url) {
        // Break out of the Lovable preview iframe — Spotify refuses to load in iframes.
        try {
          if (window.top && window.top !== window.self) {
            window.top.location.href = d.url;
            return;
          }
        } catch {
          // Cross-origin top access blocked — fall through to opening a new tab.
        }
        window.open(d.url, "_blank", "noopener,noreferrer");
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spotify-status"] }),
  });

  const generate = useMutation({
    mutationFn: () => generateFn(),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["spotify-status"] });
      if (d?.ok) setBanner(`Playlist refreshed — ${d.trackCount} tracks, ${d.totalMinutes} min.`);
      else if (d?.message) setBanner(d.message);
    },
    onError: (e: unknown) => setBanner(e instanceof Error ? e.message : "Couldn't generate playlist."),
  });

  const connected = !!status.data?.connected;
  const playlist = status.data?.playlist;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Spotify"
        title="Concerts"
        subtitle="Auto playlist of artists with NYC shows in the next 6 months."
      />
      <main className="space-y-3 px-5 pb-6">
        {banner && (
          <div className="paint-card px-3 py-2 text-xs text-[color:var(--ink)]">{banner}</div>
        )}

        <div
          className="paint-card relative overflow-hidden p-5 text-[color:var(--cream)]"
          style={{
            background:
              "linear-gradient(135deg, #0B2C7A 0%, #1E3A8A 45%, #FF3DA5 100%)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
            NYC Next 6 Months
          </p>
          <h2 className="font-display text-3xl leading-tight">
            {playlist
              ? `${playlist.trackCount} tracks · ${playlist.totalMinutes} min`
              : "Your weekly mixtape"}
          </h2>
          <p className="mt-1 text-sm opacity-90">
            {connected
              ? `Connected as ${status.data?.displayName}.`
              : "Connect Spotify to auto-build a private playlist."}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {!connected && (
              <button
                onClick={() => connect.mutate()}
                disabled={connect.isPending}
                className="rounded-full bg-[color:var(--cream)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--cobalt)] disabled:opacity-60"
              >
                {connect.isPending ? "Opening Spotify…" : "Connect Spotify"}
              </button>
            )}
            {connected && (
              <>
                <button
                  onClick={() => generate.mutate()}
                  disabled={generate.isPending}
                  className="rounded-full bg-[color:var(--cream)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--cobalt)] disabled:opacity-60"
                >
                  {generate.isPending ? "Building…" : playlist ? "Refresh playlist" : "Generate playlist"}
                </button>
                {playlist && (
                  <a
                    href={playlist.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[color:var(--cream)]/60 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--cream)]"
                  >
                    Open in Spotify
                  </a>
                )}
                <button
                  onClick={() => disconnect.mutate()}
                  className="rounded-full border border-[color:var(--cream)]/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[color:var(--cream)]/80"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>

          {playlist?.lastRefreshedAt && (
            <p className="mt-2 text-[11px] opacity-75">
              Last refreshed {new Date(playlist.lastRefreshedAt).toLocaleString()}
            </p>
          )}
        </div>

        <section className="pt-2">
          <h3 className="font-display text-lg text-[color:var(--ink)]">Recommended for you</h3>
          <p className="mb-2 text-xs text-[color:var(--muted-foreground)]">
            Upcoming NYC shows by artists you listen to.
          </p>
          {!connected && (
            <p className="paint-card px-3 py-2.5 text-xs text-[color:var(--muted-foreground)]">
              Connect Spotify to see picks based on your listening history.
            </p>
          )}
          {connected && recs.isLoading && (
            <p className="paint-card px-3 py-2.5 text-xs text-[color:var(--muted-foreground)]">Loading…</p>
          )}
          {connected && recs.data && recs.data.matches.length === 0 && (
            <p className="paint-card px-3 py-2.5 text-xs text-[color:var(--muted-foreground)]">
              No matches yet. As your event library grows we'll surface artists you already love.
            </p>
          )}
          {connected && recs.data && recs.data.matches.length > 0 && (
            <ul className="space-y-2">
              {recs.data.matches.map((m) => (
                <li
                  key={m.activityId}
                  className="paint-card flex items-center justify-between px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-base text-[color:var(--ink)]">{m.title}</p>
                    <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                      {m.venue} · {m.reason}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[color:var(--cobalt)]/10 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--cobalt)]">
                    {new Date(m.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}