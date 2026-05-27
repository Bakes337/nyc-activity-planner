import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import { CATEGORY_META, type Category } from "../lib/data";
import {
  createActivity,
  parseActivityUrl,
  type ParsedActivity,
} from "../lib/activities.functions";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Add — Activity Planner" }] }),
  component: AddPage,
});

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
const PRICE_TIERS = ["free", "$", "$$", "$$$"] as const;
const KINDS = [
  { v: "one_time", label: "One-time" },
  { v: "recurring", label: "Recurring" },
  { v: "timeless", label: "No fixed date" },
] as const;
const CATS: Category[] = ["music", "food", "comedy", "art", "outdoors", "theater", "film"];

type DraftDate = { startsAt: string; endsAt: string | null };

interface Draft {
  title: string;
  venue: string;
  neighborhood: string;
  borough: (typeof BOROUGHS)[number];
  category: Category;
  priceTier: (typeof PRICE_TIERS)[number];
  priceNote: string;
  kind: (typeof KINDS)[number]["v"];
  tags: string;
  notes: string;
  sourceUrl: string;
  dates: DraftDate[];
}

function fromParsed(p: ParsedActivity): Draft {
  return {
    title: p.title,
    venue: p.venue,
    neighborhood: p.neighborhood,
    borough: p.borough,
    category: p.category,
    priceTier: p.priceTier,
    priceNote: p.priceNote ?? "",
    kind: p.kind,
    tags: p.tags.join(", "),
    notes: p.notes ?? "",
    sourceUrl: p.sourceUrl,
    dates: p.dates.map((d) => ({ startsAt: d.startsAt, endsAt: d.endsAt })),
  };
}

function emptyDraft(): Draft {
  return {
    title: "",
    venue: "",
    neighborhood: "",
    borough: "Manhattan",
    category: "music",
    priceTier: "$$",
    priceNote: "",
    kind: "timeless",
    tags: "",
    notes: "",
    sourceUrl: "",
    dates: [],
  };
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

function AddPage() {
  const navigate = useNavigate();
  const parseFn = useServerFn(parseActivityUrl);
  const saveFn = useServerFn(createActivity);

  const [url, setUrl] = useState("");
  const [hint, setHint] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function handleParse() {
    if (!url.trim()) {
      setError("Paste a link first.");
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const parsed = await parseFn({
        data: {
          url: url.trim(),
          hint: hint.trim() || undefined,
        },
      });
      setDraft(fromParsed(parsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that page.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveFn({
        data: {
          title: draft.title.trim(),
          venue: draft.venue.trim(),
          neighborhood: draft.neighborhood.trim(),
          borough: draft.borough,
          category: draft.category,
          priceTier: draft.priceTier,
          priceNote: draft.priceNote.trim() || null,
          status: "idea",
          kind: draft.kind,
          sourceUrl: draft.sourceUrl.trim() || null,
          imageSeed: "",
          notes: draft.notes.trim() || null,
          tags: draft.tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean),
          dates: draft.dates.filter((d) => d.startsAt),
        },
      });
      navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="New idea"
        title="Drop a link, dream later"
        subtitle="Paste a URL — we'll scrape the details and let you tweak before saving."
      />
      <main className="space-y-4 px-5 pb-6">
        {/* URL bar */}
        <div className="paint-card p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
            Paste a URL
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://eventbrite.com/e/…"
              className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--cream)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cobalt)]"
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={parsing}
              className="rounded-full bg-[color:var(--cobalt)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[color:var(--cream)] disabled:opacity-60"
            >
              {parsing ? "Reading…" : "Parse"}
            </button>
          </div>
          <div className="mt-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
              Focus hint <span className="text-[color:var(--muted-foreground)] font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder='e.g. "Buttercream Essentials 3" — pick a specific class on the page'
              className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--cream)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cobalt)]"
            />
          </div>
          {!draft && (
            <button
              type="button"
              onClick={() => setDraft(emptyDraft())}
              className="mt-3 text-xs font-semibold text-[color:var(--cobalt)] underline underline-offset-2"
            >
              or fill in by hand →
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-[color:var(--neon-pink)] bg-[color:var(--neon-pink)]/10 px-4 py-3 text-sm text-[color:var(--ink)]">
            {error}
          </div>
        )}

        {draft && (
          <DraftForm
            draft={draft}
            setDraft={setDraft}
            saving={saving}
            onCancel={() => navigate({ to: "/" })}
            onSave={handleSave}
          />
        )}
      </main>
    </AppShell>
  );
}

function DraftForm({
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  function addDate() {
    const d = new Date();
    d.setHours(19, 30, 0, 0);
    setDraft({
      ...draft,
      dates: [...draft.dates, { startsAt: d.toISOString(), endsAt: null }],
    });
  }
  function updateDate(i: number, iso: string) {
    const next = draft.dates.slice();
    next[i] = { ...next[i], startsAt: iso };
    setDraft({ ...draft, dates: next });
  }
  function removeDate(i: number) {
    setDraft({ ...draft, dates: draft.dates.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <div className="paint-card space-y-3 p-4">
        <Field label="Title">
          <input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Venue">
            <input
              value={draft.venue}
              onChange={(e) => set("venue", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Neighborhood">
            <input
              value={draft.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Borough">
          <div className="flex flex-wrap gap-1.5">
            {BOROUGHS.map((b) => {
              const active = draft.borough === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => set("borough", b)}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-semibold " +
                    (active
                      ? "border-transparent bg-[color:var(--cobalt)] text-[color:var(--cream)]"
                      : "border-[color:var(--border)] bg-white text-[color:var(--ink)]")
                  }
                >
                  {b}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => {
              const m = CATEGORY_META[c];
              const active = draft.category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold " +
                    (active
                      ? "border-transparent text-white"
                      : "border-[color:var(--border)] bg-white text-[color:var(--ink)]")
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
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price tier">
            <select
              value={draft.priceTier}
              onChange={(e) =>
                set("priceTier", e.target.value as Draft["priceTier"])
              }
              className={inputCls}
            >
              {PRICE_TIERS.map((p) => (
                <option key={p} value={p}>
                  {p === "free" ? "Free" : p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price note">
            <input
              value={draft.priceNote}
              onChange={(e) => set("priceNote", e.target.value)}
              placeholder="$45, 2-drink min…"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Kind">
          <div className="flex gap-1.5">
            {KINDS.map((k) => {
              const active = draft.kind === k.v;
              return (
                <button
                  key={k.v}
                  type="button"
                  onClick={() => set("kind", k.v)}
                  className={
                    "flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                    (active
                      ? "border-transparent bg-[color:var(--forest)] text-[color:var(--cream)]"
                      : "border-[color:var(--border)] bg-white text-[color:var(--ink)]")
                  }
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      {draft.kind !== "timeless" && (
        <div className="paint-card space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
              Dates
            </span>
            <button
              type="button"
              onClick={addDate}
              className="rounded-full bg-[color:var(--neon-pink)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white"
            >
              + Add date
            </button>
          </div>
          {draft.dates.length === 0 && (
            <p className="text-xs italic text-[color:var(--muted-foreground)]">
              No dates yet — add one.
            </p>
          )}
          {draft.dates.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={toLocalInput(d.startsAt)}
                onChange={(e) => updateDate(i, fromLocalInput(e.target.value))}
                className={inputCls + " flex-1"}
              />
              <button
                type="button"
                onClick={() => removeDate(i)}
                className="rounded-full border border-[color:var(--border)] bg-white px-2.5 py-1 text-xs"
                aria-label="Remove date"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="paint-card space-y-3 p-4">
        <Field label="Tags (comma-separated)">
          <input
            value={draft.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="indie, late night, date"
            className={inputCls}
          />
        </Field>
        <Field label="Notes">
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className={inputCls + " resize-none"}
          />
        </Field>
        <Field label="Source URL">
          <input
            value={draft.sourceUrl}
            onChange={(e) => set("sourceUrl", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--ink)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-full bg-[color:var(--neon-pink)] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save to library"}
        </button>
      </div>
    </>
  );
}

const inputCls =
  "w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--cream)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cobalt)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}