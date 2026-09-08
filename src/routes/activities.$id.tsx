import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import {
  CATEGORY_META,
  categoryMeta,
  formatDate,
  formatTime,
  seedGradient,
} from "../lib/data";
import { listActivities, deleteActivity, refreshActivityDates } from "../lib/activities.functions";
import { rowToActivity, type ActivityRow } from "../lib/activities";
import { getActivityTravel } from "../lib/location.functions";

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
  const fetchTravel = useServerFn(getActivityTravel);
  const refresh = useServerFn(refreshActivityDates);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => fetchList(),
  });

  const { data: travelResp, isLoading: travelLoading } = useQuery({
    queryKey: ["travel", id],
    queryFn: () => fetchTravel({ data: { activityId: id } }),
    staleTime: 1000 * 60 * 60,
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

  const refreshMut = useMutation({
    mutationFn: () => refresh({ data: { id } }),
    onMutate: () => setRefreshError(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
    onError: (e: unknown) =>
      setRefreshError(e instanceof Error ? e.message : "Couldn't refresh dates."),
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

        <TravelFromHome loading={travelLoading} resp={travelResp} />

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Upcoming dates</h2>
            {activity.sourceUrl && (
              <button
                onClick={() => refreshMut.mutate()}
                disabled={refreshMut.isPending}
                className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-[11px] font-semibold text-[color:var(--ink)] disabled:opacity-60"
              >
                {refreshMut.isPending ? "Refreshing…" : "↻ Refresh"}
              </button>
            )}
          </div>
          {activity.isMonitored && (
            <p className="mt-1 text-[11px] text-[color:var(--cobalt)]">
              ✓ Monitored — new dates are pulled from the source URL automatically.
            </p>
          )}
          {refreshError && (
            <p className="mt-1 text-xs text-[color:var(--neon-pink)]">{refreshError}</p>
          )}
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

        <section className="mt-8 paint-card space-y-2 p-4">
          <h2 className="font-display text-xl">Been there?</h2>
          {activity.doneAt ? (
            <>
              <p className="text-sm text-[color:var(--ink)]">
                Marked done {new Date(activity.doneAt).toLocaleDateString()}
                {activity.rating ? ` · rated ${activity.rating}/4` : ""}
              </p>
              {activity.ratingNotes && (
                <p className="rounded-xl bg-white/80 px-3 py-2 text-sm text-[color:var(--muted-foreground)]">
                  {activity.ratingNotes}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setRatingOpen(true)}
                  className="rounded-full bg-[color:var(--cobalt)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cream)]"
                >
                  Edit rating
                </button>
                <button
                  onClick={() => unmarkMut.mutate()}
                  disabled={unmarkMut.isPending}
                  className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-xs font-bold text-[color:var(--ink)] disabled:opacity-60"
                >
                  {unmarkMut.isPending ? "…" : "Undo done"}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Mark it done and rate it 1–4 so future suggestions get smarter.
              </p>
              <button
                onClick={() => setRatingOpen(true)}
                className="rounded-full bg-[color:var(--neon-pink)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              >
                ✓ Mark as done
              </button>
            </>
          )}
        </section>

        {ratingOpen && (
          <RatingDialog
            title={activity.title}
            initialRating={activity.rating}
            initialNotes={activity.ratingNotes}
            busy={markMut.isPending}
            error={markMut.error instanceof Error ? markMut.error.message : null}
            onCancel={() => setRatingOpen(false)}
            onSave={(value, notes) => markMut.mutate({ rating: value, notes })}
          />
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
          {confirmingDelete ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 p-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">
                Delete this activity? This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                  className="flex-1 rounded-full bg-[color:var(--neon-pink)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {deleteMut.isPending ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleteMut.isPending}
                  className="flex-1 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              disabled={deleteMut.isPending}
              className="rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:opacity-60"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

type TravelLeg = { durationSeconds: number | null; distanceMeters: number | null };
type TravelResp =
  | { status: "ok"; travel: { drive: TravelLeg | null; transit: TravelLeg | null; walk: TravelLeg | null } }
  | { status: "no_home" | "no_activity" | "no_venue" };

function fmtDuration(s: number | null): string {
  if (s == null) return "—";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function fmtDistance(m: number | null): string {
  if (m == null) return "";
  const mi = m / 1609.34;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

function TravelFromHome({ loading, resp }: { loading: boolean; resp: TravelResp | undefined }) {
  if (loading) {
    return (
      <section className="mt-5 paint-card p-3 text-xs text-[color:var(--muted-foreground)]">
        Calculating travel from home…
      </section>
    );
  }
  if (!resp) return null;
  if (resp.status === "no_home") {
    return (
      <section className="mt-5 paint-card p-3 text-xs">
        <div className="font-semibold text-[color:var(--ink)]">From home</div>
        <p className="mt-1 text-[color:var(--muted-foreground)]">
          Add your home address in{" "}
          <Link to="/settings" className="underline">Settings</Link> to see travel times.
        </p>
      </section>
    );
  }
  if (resp.status !== "ok") {
    return (
      <section className="mt-5 paint-card p-3 text-xs text-[color:var(--muted-foreground)]">
        Couldn't calculate travel for this venue.
      </section>
    );
  }
  const { drive, transit, walk } = resp.travel;
  const items: Array<{ key: string; label: string; leg: TravelLeg | null }> = [
    { key: "drive", label: "Drive", leg: drive },
    { key: "transit", label: "Transit", leg: transit },
    { key: "walk", label: "Walk", leg: walk },
  ];
  return (
    <section className="mt-5">
      <h2 className="font-display text-xl">From home</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.key} className="paint-card p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              {it.label}
            </div>
            <div className="mt-1 font-display text-lg leading-tight">
              {fmtDuration(it.leg?.durationSeconds ?? null)}
            </div>
            <div className="text-[10px] text-[color:var(--muted-foreground)]">
              {fmtDistance(it.leg?.distanceMeters ?? null)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}