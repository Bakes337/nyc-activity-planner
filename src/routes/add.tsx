import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Add — Activity Planner" }] }),
  component: AddPage,
});

function AddPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  return (
    <AppShell>
      <PageHeader
        eyebrow="New idea"
        title="Drop a link, dream later"
        subtitle="Paste a URL or jot a quick note — we'll fill in the rest."
      />
      <main className="space-y-4 px-5 pb-6">
        <div className="paint-card p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
            Paste a URL
          </label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://boweryballroom.com/event/..."
            className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--cream)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cobalt)]"
          />
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
            (Stub) In Phase 2 this will fetch metadata, dates and an image automatically.
          </p>
        </div>
        <div className="paint-card p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--cobalt)]">
            Or a quick note
          </label>
          <textarea
            rows={4}
            placeholder="That ramen spot Sarah mentioned…"
            className="mt-2 w-full resize-none rounded-lg border border-[color:var(--border)] bg-[color:var(--cream)] px-3 py-2 text-sm outline-none focus:border-[color:var(--cobalt)]"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 rounded-full border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--ink)]"
          >
            Cancel
          </button>
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex-1 rounded-full bg-[color:var(--neon-pink)] px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white"
          >
            Save idea
          </button>
        </div>
      </main>
    </AppShell>
  );
}