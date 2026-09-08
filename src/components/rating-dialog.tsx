import { useState } from "react";

export const RATING_SCALE: { value: number; label: string; blurb: string }[] = [
  { value: 1, label: "Hated it", blurb: "Not for me" },
  { value: 2, label: "It was fine", blurb: "Wouldn't necessarily recommend" },
  { value: 3, label: "Fun", blurb: "Glad I did it, but wouldn't rave" },
  { value: 4, label: "Loved it", blurb: "Would recommend, maybe do again" },
];

export function RatingDialog({
  title,
  initialRating,
  initialNotes,
  busy,
  error,
  onCancel,
  onSave,
}: {
  title: string;
  initialRating?: number;
  initialNotes?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (rating: number, notes: string) => void;
}) {
  const [rating, setRating] = useState<number | undefined>(initialRating);
  const [notes, setNotes] = useState(initialNotes ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[color:var(--ink)]/45 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="paint-card w-full max-w-[420px] space-y-3 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--cobalt)]">
            How was it?
          </p>
          <h2 className="font-display text-2xl leading-tight text-[color:var(--ink)]">{title}</h2>
        </div>

        <div className="space-y-1.5">
          {RATING_SCALE.map((r) => {
            const active = rating === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRating(r.value)}
                className={
                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition " +
                  (active
                    ? "border-transparent bg-[color:var(--cobalt)] text-[color:var(--cream)]"
                    : "border-[color:var(--border)] bg-white/80 text-[color:var(--ink)] hover:bg-white")
                }
              >
                <span
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
                    (active
                      ? "bg-[color:var(--neon-pink)] text-white"
                      : "bg-[color:var(--cream)] text-[color:var(--cobalt)]")
                  }
                >
                  {r.value}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">{r.label}</span>
                  <span
                    className={
                      "block text-[11px] leading-tight " +
                      (active ? "text-[color:var(--cream)]/80" : "text-[color:var(--muted-foreground)]")
                    }
                  >
                    {r.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes — what worked, what didn't, who you'd bring…"
          className="w-full resize-none rounded-2xl bg-white px-3 py-2 text-sm outline-none ring-1 ring-[color:var(--border)]"
        />

        {error && <p className="text-xs text-[color:var(--neon-pink)]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-xs font-bold text-[color:var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!rating || busy}
            onClick={() => rating && onSave(rating, notes)}
            className="rounded-full bg-[color:var(--neon-pink)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
