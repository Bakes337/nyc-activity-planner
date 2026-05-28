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

export function ActivityCard({ a }: { a: Activity }) {
  const meta = categoryMeta(a.category);
  const next = nextDate(a);
  const soldOut = next?.isSoldOut;

  return (
    <Link
      to="/activities/$id"
      params={{ id: a.id }}
      className="paint-card flex flex-col text-left transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div
        className="relative aspect-[16/10] w-full"
        style={{ background: seedGradient(a.imageSeed) }}
      >
        {/* painted abstract shapes */}
        <svg
          aria-hidden
          viewBox="0 0 200 120"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full opacity-90"
        >
          <path
            d="M0,80 C 40,40 80,110 120,70 S 200,60 200,90 L200,120 L0,120 Z"
            fill="rgba(255,255,255,0.18)"
          />
          <circle cx="160" cy="32" r="22" fill="rgba(255,255,255,0.22)" />
          <path
            d="M10,30 C 50,10 90,50 130,20"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[color:var(--cream)]/95 px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ink)] shadow-sm">
          <span
            className="cat-dot"
            style={{ background: meta.color }}
            aria-hidden
          />
          {meta.label}
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-[color:var(--ink)]/85 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[color:var(--cream)]">
          {a.priceTier}
        </div>
        {soldOut && (
          <div className="absolute inset-x-3 bottom-3 rounded-md bg-[color:var(--ink)]/85 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--neon-pink)]">
            Next date sold out
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-display text-xl leading-tight text-[color:var(--ink)]">
          {a.title}
        </h3>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {a.venue} · {a.neighborhood}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-[color:var(--cobalt)]">
            {next
              ? `${formatDate(next.startsAt)} · ${formatTime(next.startsAt)}`
              : a.kind === "timeless"
                ? "Anytime"
                : "No upcoming date"}
          </span>
          {a.priceNote && (
            <span className="text-[color:var(--muted-foreground)]">
              {a.priceNote}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}