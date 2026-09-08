import { Link } from "@tanstack/react-router";
import {
  type Activity,
  CATEGORY_META,
  categoryMeta,
  formatDate,
  formatTime,
  nextDate,
  seedGradient,
} from "../lib/data";
import { ActivityIllustration } from "./activity-illustration";

export function ActivityCard({ a, onMarkDone }: { a: Activity; onMarkDone?: () => void }) {
  const meta = categoryMeta(a.category);
  const next = nextDate(a);
  const soldOut = next?.isSoldOut;
  const done = Boolean(a.doneAt);

  return (
    <Link
      to="/activities/$id"
      params={{ id: a.id }}
      className="paint-card group flex flex-col text-left transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className="relative aspect-[16/10] w-full"
        style={{ background: seedGradient(a.imageSeed) }}
      >
        <ActivityIllustration activity={a} />
      </div>

      <div className="relative flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--cream)]/95 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ink)] shadow-sm ring-1 ring-[color:var(--border)]">
            <span
              className="cat-dot"
              style={{ background: meta.color }}
              aria-hidden
            />
            {meta.label}
          </div>
          <div className="rounded-full bg-[color:var(--ink)]/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--cream)]">
            {a.priceTier}
          </div>
        </div>

        <h3 className="font-display text-xl leading-tight text-[color:var(--ink)]">
          {a.title}
        </h3>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {a.venue} · {a.neighborhood}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-[color:var(--border)]/60 pt-3 text-xs">
          <span className="font-semibold text-[color:var(--cobalt)]">
            {next
              ? `${formatDate(next.startsAt)} · ${formatTime(next.startsAt)}`
              : a.kind === "timeless"
                ? "Anytime"
                : "No upcoming date"}
          </span>
          {soldOut && !done && (
            <span className="rounded-md bg-[color:var(--neon-pink)]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--neon-pink)]">
              Sold out
            </span>
          )}
          {a.priceNote && !soldOut && (
            <span className="text-[color:var(--muted-foreground)]">
              {a.priceNote}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          {done ? (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--forest)]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--forest)]">
              <span>✓</span>
              Done{a.rating ? ` · ${a.rating}/4` : ""}
            </div>
          ) : (
            onMarkDone && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkDone();
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-[color:var(--muted-foreground)] ring-1 ring-[color:var(--border)] transition hover:bg-[color:var(--cream)] hover:text-[color:var(--ink)]"
              >
                ✓ Mark done
              </button>
            )
          )}
        </div>
      </div>
    </Link>
  );
}
