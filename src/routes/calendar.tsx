import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import {
  CATEGORY_META,
  categoryMeta,
  formatTime,
  type Activity,
  type ActivityDate,
  isPassedOneTime,
} from "../lib/data";
import { listActivities } from "../lib/activities.functions";
import { rowToActivity, type ActivityRow } from "../lib/activities";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Activity Planner" },
      {
        name: "description",
        content:
          "An agenda strip view of every upcoming idea on your NYC calendar.",
      },
    ],
  }),
  component: CalendarPage,
});

interface DayBucket {
  date: Date;
  items: { activity: Activity; date: ActivityDate }[];
}

function CalendarPage() {
  const fetchList = useServerFn(listActivities);
  const { data: rows = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => fetchList(),
  });
  const activities = useMemo(
    () =>
      (rows as ActivityRow[])
        .map(rowToActivity)
        .filter((a) => !isPassedOneTime(a)),
    [rows],
  );

  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));

  const buckets: DayBucket[] = useMemo(() => {
    // 14-day rolling agenda from anchor
    const days: DayBucket[] = [];
    for (let i = 0; i < 14; i++) {
      const day = new Date(anchor);
      day.setDate(anchor.getDate() + i);
      day.setHours(0, 0, 0, 0);
      days.push({ date: day, items: [] });
    }
    for (const a of activities) {
      for (const d of a.dates) {
        if (d.isSoldOut) continue;
        const ds = new Date(d.startsAt);
        const idx = Math.floor(
          (new Date(ds.getFullYear(), ds.getMonth(), ds.getDate()).getTime() -
            days[0].date.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (idx >= 0 && idx < days.length) {
          days[idx].items.push({ activity: a, date: d });
        }
      }
    }
    for (const b of days)
      b.items.sort(
        (x, y) =>
          new Date(x.date.startsAt).getTime() -
          new Date(y.date.startsAt).getTime(),
      );
    return days;
  }, [anchor, activities]);

  const [selectedIdx, setSelectedIdx] = useState(0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Up next"
        title="Two weeks of ideas"
        subtitle="Tap a day to scroll to it. Sold-out dates are hidden."
        right={
          <div className="flex gap-2 pt-2">
            <button
              onClick={() =>
                setAnchor((prev) => {
                  const x = new Date(prev);
                  x.setDate(x.getDate() - 7);
                  return x;
                })
              }
              className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold"
            >
              ←
            </button>
            <button
              onClick={() =>
                setAnchor((prev) => {
                  const x = new Date(prev);
                  x.setDate(x.getDate() + 7);
                  return x;
                })
              }
              className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-xs font-semibold"
            >
              →
            </button>
          </div>
        }
      />

      {/* Week strip */}
      <div className="sticky top-0 z-10 bg-[color:var(--background)]/90 px-3 pb-3 pt-2 backdrop-blur-md">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {buckets.map((b, i) => {
            const active = i === selectedIdx;
            const today = isSameDay(b.date, new Date());
            return (
              <button
                key={b.date.toISOString()}
                onClick={() => {
                  setSelectedIdx(i);
                  document
                    .getElementById(`day-${i}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={
                  "relative flex w-12 shrink-0 flex-col items-center rounded-xl px-1 py-2 text-center transition " +
                  (active
                    ? "bg-[color:var(--cobalt)] text-[color:var(--cream)]"
                    : "bg-white/80 text-[color:var(--ink)]")
                }
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  {b.date.toLocaleDateString(undefined, { weekday: "short" })}
                </span>
                <span className="font-display text-xl leading-none">
                  {b.date.getDate()}
                </span>
                <span className="mt-1 flex h-1.5 items-center gap-0.5">
                  {b.items.slice(0, 4).map((it) => (
                    <span
                      key={it.date.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: categoryMeta(it.activity.category).color,
                      }}
                    />
                  ))}
                </span>
                {today && (
                  <span
                    className="absolute -top-1 right-1 h-2 w-2 rounded-full"
                    style={{ background: "var(--neon-pink)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="space-y-5 px-5 pb-6 pt-2">
        {buckets.map((b, i) => (
          <section key={b.date.toISOString()} id={`day-${i}`} className="scroll-mt-32">
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="font-display text-2xl leading-none text-[color:var(--ink)]">
                {b.date.toLocaleDateString(undefined, {
                  weekday: "long",
                })}
              </h2>
              <span className="text-sm text-[color:var(--muted-foreground)]">
                {b.date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {isSameDay(b.date, new Date()) && (
                <span className="rounded-full bg-[color:var(--neon-pink)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Today
                </span>
              )}
            </div>

            {b.items.length === 0 ? (
              <p className="text-sm italic text-[color:var(--muted-foreground)]">
                Open day — schedule something dreamy.
              </p>
            ) : (
              <div className="space-y-2">
                {b.items.map(({ activity, date }) => {
                  const meta = categoryMeta(activity.category);
                  return (
                    <Link
                      key={date.id}
                      to="/activities/$id"
                      params={{ id: activity.id }}
                      className="paint-card flex items-stretch overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div
                        className="w-1.5 shrink-0"
                        style={{ background: meta.color }}
                        aria-hidden
                      />
                      <div className="flex flex-1 items-center justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="font-display text-base leading-tight text-[color:var(--ink)]">
                            {activity.title}
                          </p>
                          <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                            {activity.venue} · {activity.neighborhood}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm font-bold text-[color:var(--cobalt)]">
                            {formatTime(date.startsAt)}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                            {meta.label} · {activity.priceTier}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </main>
    </AppShell>
  );
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}