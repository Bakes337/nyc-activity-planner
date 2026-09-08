import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import { ActivityCard } from "../components/activity-card";
import { RatingDialog } from "../components/rating-dialog";
import {
  CATEGORY_META,
  categoryMeta,
  type Category,
  type PriceTier,
  nextDate,
  isPassedOneTime,
} from "../lib/data";
import { listActivities, markActivityDone } from "../lib/activities.functions";
import { getHomeProfile } from "../lib/location.functions";
import { rowToActivity, type ActivityRow } from "../lib/activities";
import { listSuggestions } from "../lib/organizers.functions";
import { Link } from "@tanstack/react-router";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Library — Activity Planner" },
      {
        name: "description",
        content: "All your bookmarked NYC ideas, in one painterly library.",
      },
      { property: "og:title", content: "Library — Activity Planner" },
      {
        property: "og:description",
        content: "All your bookmarked NYC ideas, in one painterly library.",
      },
    ],
  }),
  component: Index,
});

const CATS: Category[] = [
  "music",
  "food",
  "comedy",
  "culture",
  "crafts",
  "active",
  "theater",
  "film",
];
const PRICES: PriceTier[] = ["free", "$", "$$", "$$$"];
const WHEN_OPTIONS = ["any", "thisWeek", "weekend", "thisMonth"] as const;
type When = (typeof WHEN_OPTIONS)[number];

function isThisWeek(d: Date) {
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -1 && diff <= 7;
}
function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
function isThisMonth(d: Date) {
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function Index() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listActivities);
  const fetchSuggestions = useServerFn(listSuggestions);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["activities"],
    queryFn: () => fetchList(),
  });
  const { data: suggestionRows = [] } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => fetchSuggestions(),
  });
  const suggestionCount = (suggestionRows as unknown[]).length;
  const activities = useMemo(
    () =>
      (rows as ActivityRow[])
        .map(rowToActivity)
        .filter((a) => !isPassedOneTime(a)),
    [rows],
  );

  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [prices, setPrices] = useState<Set<PriceTier>>(new Set());
  const [when, setWhen] = useState<When>("any");
  const [hideDone, setHideDone] = useState(true);
  const [rating, setRating] = useState<{ id: string; title: string } | null>(null);

  const getHome = useServerFn(getHomeProfile);
  const { data: profile } = useQuery({ queryKey: ["home-profile"], queryFn: () => getHome() });
  const hideSoldOut = !(profile?.show_sold_out ?? false);

  const markDone = useServerFn(markActivityDone);
  const markMut = useMutation({
    mutationFn: (vars: { id: string; rating: number; notes: string }) =>
      markDone({ data: { id: vars.id, rating: vars.rating, notes: vars.notes } }),
    onSuccess: async () => {
      setRating(null);
      await qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (hideDone && a.doneAt) return false;
      if (cats.size > 0 && !cats.has(a.category)) return false;
      if (prices.size > 0 && !prices.has(a.priceTier)) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !a.title.toLowerCase().includes(q) &&
          !a.venue.toLowerCase().includes(q) &&
          !a.neighborhood.toLowerCase().includes(q)
        )
          return false;
      }
      const next = nextDate(a);
      if (hideSoldOut && next?.isSoldOut) return false;
      if (when !== "any") {
        if (!next) return false;
        const ds = new Date(next.startsAt);
        if (when === "thisWeek" && !isThisWeek(ds)) return false;
        if (when === "weekend" && !isWeekend(ds)) return false;
        if (when === "thisMonth" && !isThisMonth(ds)) return false;
      }
      return true;
    });
  }, [activities, query, cats, prices, when, hideSoldOut, hideDone]);


  function toggle<T>(set: Set<T>, v: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your library"
        title="NYC, on your terms"
        subtitle={`${activities.length} bookmarked idea${activities.length === 1 ? "" : "s"} — filter, dream, plan.`}
      />

      <div className="flex items-center justify-end gap-2 px-5 pb-1 text-[11px] font-semibold">
        <Link
          to="/suggestions"
          className={
            "rounded-full px-3 py-1 ring-1 " +
            (suggestionCount > 0
              ? "bg-[color:var(--neon-pink)] text-white ring-transparent"
              : "bg-white/70 text-[color:var(--ink)] ring-[color:var(--border)]")
          }
        >
          ✉ Suggestions{suggestionCount > 0 ? ` (${suggestionCount})` : ""}
        </Link>
        <Link
          to="/settings"
          className="rounded-full bg-white/70 px-3 py-1 text-[color:var(--ink)] ring-1 ring-[color:var(--border)]"
        >
          ⚙ Settings
        </Link>
      </div>

      <div className="sticky top-0 z-10 px-3 pb-3 pt-1">
        <div
          className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--cream)]/85 p-3 shadow-[0_10px_30px_-18px_rgba(11,44,122,0.35)] backdrop-blur-md"
        >
          <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-[color:var(--border)]">
            <span aria-hidden className="text-[color:var(--cobalt)]">🔎</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search venues, neighborhoods, ideas…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <WhenChip when={when} setWhen={setWhen} />

            <PriceSelect prices={prices} setPrices={setPrices} />

            <span className="mx-0.5 h-5 w-px rounded-full bg-[color:var(--border)]" aria-hidden />

            {CATS.map((c) => {
              const m = categoryMeta(c);
              const active = cats.has(c);
              return (
                <button
                  key={c}
                  onClick={() => toggle(cats, c, setCats)}
                  className={
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                    (active
                      ? "border-transparent text-white shadow-sm"
                      : "border-[color:var(--border)] bg-white/80 text-[color:var(--ink)] hover:bg-white")
                  }
                  style={active ? { background: m.color } : undefined}
                >
                  <span
                    className="cat-dot"
                    style={{ background: active ? "white" : m.color }}
                  />
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[color:var(--muted-foreground)]">
            <span>{filtered.length} matches</span>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => setHideDone(e.target.checked)}
                className="h-3.5 w-3.5 accent-[color:var(--cobalt)]"
              />
              Hide ones I've done
            </label>
          </div>
        </div>
      </div>

      <main className="grid grid-cols-1 gap-4 px-5 pb-6 pt-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((a) => (
          <ActivityCard
            key={a.id}
            a={a}
            onMarkDone={() => setRating({ id: a.id, title: a.title })}
          />
        ))}

        {filtered.length === 0 && !isLoading && (
          <p className="col-span-full mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
            {activities.length === 0
              ? "Your library is empty — tap + to paste your first link."
              : "No matches. Loosen a filter or clear the search."}
          </p>
        )}
        {isLoading && (
          <p className="col-span-full mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
            Loading your library…
          </p>
        )}
      </main>

      {rating && (
        <RatingDialog
          title={rating.title}
          busy={markMut.isPending}
          error={markMut.error instanceof Error ? markMut.error.message : null}
          onCancel={() => setRating(null)}
          onSave={(value, notes) => markMut.mutate({ id: rating.id, rating: value, notes })}
        />
      )}
    </AppShell>

  );
}

function WhenChip({
  when,
  setWhen,
}: {
  when: When;
  setWhen: (w: When) => void;
}) {
  const labels: Record<When, string> = {
    any: "Any time",
    thisWeek: "This week",
    weekend: "Weekend",
    thisMonth: "This month",
  };
  return (
    <div className="relative">
      <select
        value={when}
        onChange={(e) => setWhen(e.target.value as When)}
        className="appearance-none rounded-full border border-transparent bg-[color:var(--cobalt)] py-1.5 pl-3 pr-7 text-xs font-bold text-[color:var(--cream)] outline-none"
      >
        {(Object.keys(labels) as When[]).map((k) => (
          <option key={k} value={k}>
            {labels[k]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[color:var(--cream)]">▾</span>
    </div>
  );
}

function PriceSelect({
  prices,
  setPrices,
}: {
  prices: Set<PriceTier>;
  setPrices: (s: Set<PriceTier>) => void;
}) {
  const allPrices: PriceTier[] = ["free", "$", "$$", "$$$"];
  const label =
    prices.size === 0
      ? "Any price"
      : allPrices
          .filter((p) => prices.has(p))
          .map((p) => (p === "free" ? "Free" : p))
          .join(", ");
  const value = prices.size === 0 ? "any" : "custom";
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1.5 text-xs font-bold text-[color:var(--ink)] hover:bg-white">
        <span>{label}</span>
        <span className="text-[10px] opacity-60">▾</span>
        <input type="hidden" value={value} readOnly />
      </summary>
      <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[160px] rounded-2xl border border-[color:var(--border)] bg-white p-2 shadow-lg">
        <button
          type="button"
          onClick={() => setPrices(new Set())}
          className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream)]"
        >
          Any price
          {prices.size === 0 && <span className="text-[color:var(--neon-pink)]">✓</span>}
        </button>
        {allPrices.map((p) => {
          const checked = prices.has(p);
          return (
            <label
              key={p}
              className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream)]"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = new Set(prices);
                    if (next.has(p)) next.delete(p);
                    else next.add(p);
                    setPrices(next);
                  }}
                  className="h-3.5 w-3.5 accent-[color:var(--cobalt)]"
                />
                {p === "free" ? "Free" : p}
              </span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
