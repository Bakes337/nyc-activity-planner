import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import {
  CATEGORY_META,
  categoryMeta,
  formatDate,
  formatTime,
  seedGradient,
} from "../lib/data";
import { listActivities, deleteActivity } from "../lib/activities.functions";
import { rowToActivity, type ActivityRow } from "../lib/activities";

export const Route = createFileRoute("/activities/$id")({
  head: () => ({
    meta: [{ title: "Activity — Library" }],
  }),
  component: ActivityDetailPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="p-8 text-center">
        <p className="font-display text-2xl">Not found.</p>
        <Link to="/" className="mt-3 inline-block underline">
          Back to library
        </Link>
      </div>
    </AppShell>
  ),
});

function ActivityDetailPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const fetchList = useServerFn(listActivities);
  const del = useServerFn(deleteActivity);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => fetchList(),
  });

  const activity = useMemo(() => {
    const row = (rows as ActivityRow[]).find((r) => r.id === id);
    return row ? rowToActivity(row) : null;
  }, [rows, id]);

  const deleteMut = useMutation({
    mutationFn: () => del({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["activities"] });
      router.navigate({ to: "/" });
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-8 text-center text-[color:var(--muted-foreground)]">
          Loading…
        </div>
      </AppShell>
    );
  }

  if (!activity) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <p className="font-display text-2xl">Activity not found.</p>
          <Link to="/" className="mt-3 inline-block underline">
            Back to library
          </Link>
        </div>
      </AppShell>
    );
  }

  const meta = categoryMeta(activity.category);
  const upcoming = [...activity.dates]
    .filter((d) => new Date(d.startsAt).getTime() >= Date.now() - 3600 * 1000)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const past = activity.dates.filter(
    (d) => !upcoming.find((u) => u.id === d.id),
  );
  const durationHours = activity.durationMinutes
    ? Math.round((activity.durationMinutes / 60) * 4) / 4
    : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow={meta.label}
        title={activity.title}
        subtitle={`${activity.venue} · ${activity.neighborhood}, ${activity.borough}`}
        right={
          <Link
            to="/"
            className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold"
          >
            ← Back
          </Link>
        }
      />

      <div className="px-5 pb-8">
        <div
          className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl"
          style={{ background: seedGradient(activity.imageSeed) }}
        >
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[color:var(--cream)]/95 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ink)] shadow-sm">
            <span
              className="cat-dot"
              style={{ background: meta.color }}
              aria-hidden
            />
            {meta.label}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-[color:var(--ink)]/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--cream)]">
            {activity.priceTier}
            {activity.priceNote ? ` · ${activity.priceNote}` : ""}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="paint-card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Status
            </dt>
            <dd className="mt-1 font-display text-lg capitalize">
              {activity.status}
            </dd>
          </div>
          <div className="paint-card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Duration
            </dt>
            <dd className="mt-1 font-display text-lg">
              {durationHours ? `${durationHours} hr` : "—"}
            </dd>
          </div>
        </dl>

        {activity.notes && (
          <p className="mt-5 text-sm leading-relaxed text-[color:var(--ink)]">
            {activity.notes}
          </p>
        )}

        {activity.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {activity.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ink)]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <section className="mt-6">
          <h2 className="font-display text-xl">Upcoming dates</h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm italic text-[color:var(--muted-foreground)]">
              {activity.kind === "timeless"
                ? "Anytime — no fixed date."
                : "No upcoming dates."}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {upcoming.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-[color:var(--cobalt)]">
                    {formatDate(d.startsAt)} · {formatTime(d.startsAt)}
                  </span>
                  {d.isSoldOut && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--neon-pink)]">
                      Sold out
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Past
            </h3>
            <ul className="mt-1.5 space-y-1 text-xs text-[color:var(--muted-foreground)]">
              {past.map((d) => (
                <li key={d.id}>
                  {formatDate(d.startsAt)} · {formatTime(d.startsAt)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 flex flex-col gap-2">
          {activity.sourceUrl && (
            <a
              href={activity.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[color:var(--cobalt)] px-4 py-2 text-center text-sm font-semibold text-[color:var(--cream)]"
            >
              Open source ↗
            </a>
          )}
          <button
            onClick={() => {
              if (confirm("Delete this activity?")) deleteMut.mutate();
            }}
            disabled={deleteMut.isPending}
            className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:opacity-60"
          >
            {deleteMut.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}