import { Link } from "@tanstack/react-router";
import {
  type Activity,
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
      className="paint-card group relative flex flex-col text-left transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className="relative aspect-[16/10] w-full"
        style={{ background: seedGradient(a.imageSeed) }}
      >
        <ActivityIllustration activity={a} />
      </div>

      <div className="relative flex flex-1 flex-col gap-1.5 px-4 pt-4 pb-11">
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

        <div className="mt-auto flex items-center gap-2 text-xs">
          <span className="font-semibold text-[color:var(--cobalt)]">
            {next
              ? `${formatDate(next.startsAt)} · ${formatTime(next.startsAt)}`
              : a.kind === "timeless"
                ? "Anytime"
                : "No upcoming date"}
          </span>
          {soldOut && !done && (
            <span className="ml-auto rounded-md bg-[color:var(--neon-pink)]/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--neon-pink)]">
              Sold out
            </span>
          )}
          {a.priceNote && !soldOut && (
            <span className="ml-auto text-[color:var(--muted-foreground)]">
              {a.priceNote}
            </span>
          )}
        </div>
      </div>

      {done ? (
        <div
          className="absolute bottom-4 right-4 flex h-6 w-6 items-center justify-center rounded-md bg-[color:var(--forest)] text-[color:var(--cream)] shadow-sm"
          title={`Done${a.rating ? ` · ${a.rating}/4` : ""}`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
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
            aria-label="Mark done"
            className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--cream)]/80 text-[color:var(--forest)] opacity-60 shadow-sm transition hover:opacity-100 hover:ring-1 hover:ring-[color:var(--forest)]/30"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )
      )}
    </Link>
  );
}
