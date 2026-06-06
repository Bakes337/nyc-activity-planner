import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "../components/app-shell";
import { ACTIVITIES, nextDate } from "../lib/data";

export const Route = createFileRoute("/playlists")({
  head: () => ({ meta: [{ title: "Concerts — Activity Planner" }] }),
  component: PlaylistsPage,
});

function PlaylistsPage() {
  const concerts = ACTIVITIES.filter((a) => a.category === "music");
  return (
    <AppShell>
      <PageHeader
        eyebrow="Coming soon"
        title="Monthly mixtapes"
        subtitle="Auto-curated playlists from artists with upcoming NYC shows."
      />
      <main className="space-y-3 px-5 pb-6">
        <div
          className="paint-card relative overflow-hidden p-5 text-[color:var(--cream)]"
          style={{
            background:
              "linear-gradient(135deg, #0B2C7A 0%, #1E3A8A 45%, #FF3DA5 100%)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">
            June '26 mixtape
          </p>
          <h2 className="font-display text-3xl leading-tight">
            Brushstrokes on the BQE
          </h2>
          <p className="mt-1 text-sm opacity-90">
            {concerts.length} artists with NYC dates this month.
          </p>
          <button className="mt-3 rounded-full bg-[color:var(--cream)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
            Connect Spotify
          </button>
        </div>

        <ul className="space-y-2">
          {concerts.map((a) => {
            const n = nextDate(a);
            return (
              <li key={a.id} className="paint-card flex items-center justify-between px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-display text-base text-[color:var(--ink)]">{a.title}</p>
                  <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                    {a.venue} · {a.neighborhood}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[color:var(--cobalt)]/10 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--cobalt)]">
                  {n
                    ? new Date(n.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                    : "TBA"}
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </AppShell>
  );
}