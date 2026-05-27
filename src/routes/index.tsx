import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import { ActivityCard } from "../components/activity-card";
import {
  ACTIVITIES,
  CATEGORY_META,
  type Category,
  type PriceTier,
  nextDate,
} from "../lib/data";

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
  "art",
  "outdoors",
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
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [prices, setPrices] = useState<Set<PriceTier>>(new Set());
  const [when, setWhen] = useState<When>("any");
  const [hideSoldOut, setHideSoldOut] = useState(true);

  const filtered = useMemo(() => {
    return ACTIVITIES.filter((a) => {
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
  }, [query, cats, prices, when, hideSoldOut]);

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
        subtitle={`${ACTIVITIES.length} bookmarked ideas — filter, dream, plan.`}
      />

      <div className="sticky top-0 z-10 -mt-1 bg-[color:var(--background)]/85 px-5 pb-3 pt-2 backdrop-blur-md">
        <label className="paint-card flex items-center gap-2 px-4 py-2.5">
          <span aria-hidden className="text-[color:var(--cobalt)]">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venues, neighborhoods, ideas…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--muted-foreground)]"
          />
        </label>

        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <WhenChip when={when} setWhen={setWhen} />
          {CATS.map((c) => {
            const m = CATEGORY_META[c];
            const active = cats.has(c);
            return (
              <button
                key={c}
                onClick={() => toggle(cats, c, setCats)}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                  (active
                    ? "border-transparent text-white"
                    : "border-[color:var(--border)] bg-white/70 text-[color:var(--ink)] hover:bg-white")
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
          <span className="mx-1 self-center text-[color:var(--border)]">·</span>
          {PRICES.map((p) => {
            const active = prices.has(p);
            return (
              <button
                key={p}
                onClick={() => toggle(prices, p, setPrices)}
                className={
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition " +
                  (active
                    ? "border-transparent bg-[color:var(--ink)] text-[color:var(--cream)]"
                    : "border-[color:var(--border)] bg-white/70 text-[color:var(--ink)] hover:bg-white")
                }
              >
                {p === "free" ? "Free" : p}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[color:var(--muted-foreground)]">
          <span>{filtered.length} matches</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={hideSoldOut}
              onChange={(e) => setHideSoldOut(e.target.checked)}
              className="h-3.5 w-3.5 accent-[color:var(--cobalt)]"
            />
            Hide sold-out
          </label>
        </div>
      </div>

      <main className="grid grid-cols-1 gap-4 px-5 pb-6 pt-3 sm:grid-cols-2">
        {filtered.map((a) => (
          <ActivityCard key={a.id} a={a} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full mt-6 text-center text-sm text-[color:var(--muted-foreground)]">
            No matches. Loosen a filter or clear the search.
          </p>
        )}
      </main>
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
  const order: When[] = ["any", "thisWeek", "weekend", "thisMonth"];
  const idx = order.indexOf(when);
  const next = order[(idx + 1) % order.length];
  return (
    <button
      onClick={() => setWhen(next)}
      className="shrink-0 rounded-full border border-transparent bg-[color:var(--cobalt)] px-3 py-1.5 text-xs font-bold text-[color:var(--cream)]"
    >
      {labels[when]} ⌄
    </button>
  );
}
