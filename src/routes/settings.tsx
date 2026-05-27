import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "../components/app-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Activity Planner" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="You" title="Settings" subtitle="Phase 1 placeholder." />
      <main className="space-y-3 px-5 pb-6">
        <Row label="Display name" value="—" />
        <Row label="Home neighborhood" value="Set a home in Phase 2" />
        <Row label="Default borough" value="Manhattan" />
        <Row label="Spotify" value="Not connected" />
        <Row label="Google Calendar" value="Not connected" />
      </main>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="paint-card flex items-center justify-between px-4 py-3">
      <span className="text-sm font-semibold text-[color:var(--ink)]">{label}</span>
      <span className="text-xs text-[color:var(--muted-foreground)]">{value}</span>
    </div>
  );
}