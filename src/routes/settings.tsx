import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import {
  followOrganizer,
  listFollowedOrganizers,
  refreshOrganizer,
  unfollowOrganizer,
  updateOrganizerFilters,
} from "../lib/organizers.functions";
import { getHomeProfile, saveHomeAddress } from "../lib/location.functions";
import {
  addMonitoredUrl,
  listMonitoredUrls,
  refreshMonitoredUrl,
  removeMonitoredUrl,
} from "../lib/monitors.functions";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;
type Borough = (typeof BOROUGHS)[number];

type OrgRow = {
  id: string;
  name: string;
  url: string;
  filters: { boroughs?: string[]; hideSoldOut?: boolean } | null;
  last_checked_at: string | null;
  last_error: string | null;
};

type MonitorRow = {
  id: string;
  url: string;
  hint: string;
  title: string;
  last_checked_at: string | null;
  last_error: string | null;
  last_seen_dates: unknown;
};

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Activity Planner" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listFollowedOrganizers);
  const follow = useServerFn(followOrganizer);
  const unfollow = useServerFn(unfollowOrganizer);
  const refresh = useServerFn(refreshOrganizer);
  const updateFilters = useServerFn(updateOrganizerFilters);

  const { data: organizers = [], isLoading } = useQuery({
    queryKey: ["organizers"],
    queryFn: () => list(),
  });

  const [url, setUrl] = useState("");
  const [boroughs, setBoroughs] = useState<Set<Borough>>(new Set(["Manhattan"]));
  const [hideSoldOut, setHideSoldOut] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const followMut = useMutation({
    mutationFn: () =>
      follow({
        data: { url, filters: { boroughs: Array.from(boroughs), hideSoldOut } },
      }),
    onSuccess: () => {
      setUrl("");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["organizers"] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });

  const refreshMut = useMutation({
    mutationFn: (id: string) => refresh({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizers"] });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: (id: string) => unfollow({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizers"] }),
  });

  const filtersMut = useMutation({
    mutationFn: (vars: { id: string; filters: { boroughs: Borough[]; hideSoldOut: boolean } }) =>
      updateFilters({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organizers"] }),
  });

  // Home address
  const getHome = useServerFn(getHomeProfile);
  const saveHome = useServerFn(saveHomeAddress);
  const { data: home } = useQuery({ queryKey: ["home-profile"], queryFn: () => getHome() });
  const [addr, setAddr] = useState("");
  const [homeErr, setHomeErr] = useState<string | null>(null);
  const homeMut = useMutation({
    mutationFn: (address: string) => saveHome({ data: { address } }),
    onSuccess: () => {
      setAddr("");
      setHomeErr(null);
      qc.invalidateQueries({ queryKey: ["home-profile"] });
    },
    onError: (e) => setHomeErr(e instanceof Error ? e.message : String(e)),
  });

  // Monitored URLs
  const listMonitors = useServerFn(listMonitoredUrls);
  const addMonitor = useServerFn(addMonitoredUrl);
  const refreshMon = useServerFn(refreshMonitoredUrl);
  const removeMon = useServerFn(removeMonitoredUrl);
  const { data: monitors = [] } = useQuery({
    queryKey: ["monitors"],
    queryFn: () => listMonitors(),
  });
  const [monUrl, setMonUrl] = useState("");
  const [monHint, setMonHint] = useState("");
  const [monErr, setMonErr] = useState<string | null>(null);
  const addMonMut = useMutation({
    mutationFn: () => addMonitor({ data: { url: monUrl, hint: monHint || undefined } }),
    onSuccess: () => {
      setMonUrl("");
      setMonHint("");
      setMonErr(null);
      qc.invalidateQueries({ queryKey: ["monitors"] });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
    onError: (e) => setMonErr(e instanceof Error ? e.message : String(e)),
  });
  const refreshMonMut = useMutation({
    mutationFn: (id: string) => refreshMon({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitors"] });
      qc.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });
  const removeMonMut = useMutation({
    mutationFn: (id: string) => removeMon({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitors"] }),
  });

  function toggleBorough(b: Borough) {
    const next = new Set(boroughs);
    if (next.has(b)) next.delete(b);
    else next.add(b);
    setBoroughs(next);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="You"
        title="Settings"
        subtitle="Follow Eventbrite organizers and tune their filters."
      />
      <main className="space-y-5 px-5 pb-6">
        <section className="paint-card space-y-3 p-4">
          <h2 className="font-display text-xl">Home address</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Used to estimate drive, transit, and walking time to each saved activity.
          </p>
          {home?.home_address && (
            <div className="rounded-xl bg-white/80 px-3 py-2 text-xs">
              <div className="font-semibold text-[color:var(--ink)]">Current</div>
              <div className="text-[color:var(--muted-foreground)]">{home.home_address}</div>
            </div>
          )}
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="123 Main St, New York, NY"
            className="w-full rounded-full bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-[color:var(--border)]"
          />
          {homeErr && <p className="text-xs text-[color:var(--neon-pink)]">{homeErr}</p>}
          <button
            onClick={() => homeMut.mutate(addr)}
            disabled={!addr.trim() || homeMut.isPending}
            className="rounded-full bg-[color:var(--cobalt)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cream)] disabled:opacity-50"
          >
            {homeMut.isPending ? "Saving…" : home?.home_address ? "Update home" : "Save home"}
          </button>
        </section>

        <section className="paint-card space-y-3 p-4">
          <h2 className="font-display text-xl">Follow an organizer</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Paste an Eventbrite organizer URL (e.g.{" "}
            <code className="text-[10px]">eventbrite.com/o/…</code>). Matches show up in your{" "}
            <Link to="/suggestions" className="underline">Suggestions</Link> inbox.
          </p>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.eventbrite.com/o/86136754923"
            className="w-full rounded-full bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-[color:var(--border)]"
          />
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Boroughs (leave empty for any)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BOROUGHS.map((b) => {
                const active = boroughs.has(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBorough(b)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-semibold transition " +
                      (active
                        ? "border-transparent bg-[color:var(--cobalt)] text-[color:var(--cream)]"
                        : "border-[color:var(--border)] bg-white/80 text-[color:var(--ink)]")
                    }
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={hideSoldOut}
              onChange={(e) => setHideSoldOut(e.target.checked)}
              className="h-3.5 w-3.5 accent-[color:var(--cobalt)]"
            />
            Hide sold-out events
          </label>
          {err && <p className="text-xs text-[color:var(--neon-pink)]">{err}</p>}
          <button
            onClick={() => followMut.mutate()}
            disabled={!url || followMut.isPending}
            className="rounded-full bg-[color:var(--neon-pink)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
          >
            {followMut.isPending ? "Following…" : "Follow organizer"}
          </button>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 font-display text-xl">Followed</h2>
          {isLoading && <p className="text-xs text-[color:var(--muted-foreground)]">Loading…</p>}
          {!isLoading && organizers.length === 0 && (
            <p className="text-xs text-[color:var(--muted-foreground)]">
              Not following anyone yet.
            </p>
          )}
          {(organizers as OrgRow[]).map((o) => (
            <OrganizerCard
              key={o.id}
              o={o}
              busy={refreshMut.isPending && refreshMut.variables === o.id}
              onRefresh={() => refreshMut.mutate(o.id)}
              onUnfollow={() => unfollowMut.mutate(o.id)}
              onSaveFilters={(filters) => filtersMut.mutate({ id: o.id, filters })}
            />
          ))}
        </section>

        <section className="paint-card space-y-3 p-4">
          <h2 className="font-display text-xl">Monitor a page</h2>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Paste any class/event URL — we'll re-scrape it weekly and post any
            newly-available date to your{" "}
            <Link to="/suggestions" className="underline">Suggestions</Link> inbox.
          </p>
          <input
            value={monUrl}
            onChange={(e) => setMonUrl(e.target.value)}
            placeholder="https://www.nycakeacademy.com/collections/buttercream-essentials"
            className="w-full rounded-full bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-[color:var(--border)]"
          />
          <input
            value={monHint}
            onChange={(e) => setMonHint(e.target.value)}
            placeholder='Focus hint (optional) — e.g. "Buttercream Essentials 3"'
            className="w-full rounded-full bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-[color:var(--border)]"
          />
          {monErr && <p className="text-xs text-[color:var(--neon-pink)]">{monErr}</p>}
          <button
            onClick={() => addMonMut.mutate()}
            disabled={!monUrl.trim() || addMonMut.isPending}
            className="rounded-full bg-[color:var(--cobalt)] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cream)] disabled:opacity-50"
          >
            {addMonMut.isPending ? "Adding…" : "Monitor weekly"}
          </button>
        </section>

        {(monitors as MonitorRow[]).length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 font-display text-xl">Monitored pages</h2>
            {(monitors as MonitorRow[]).map((m) => {
              const busy = refreshMonMut.isPending && refreshMonMut.variables === m.id;
              const seen = Array.isArray(m.last_seen_dates) ? m.last_seen_dates.length : 0;
              return (
                <div key={m.id} className="paint-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[color:var(--ink)]">
                        {m.title || m.hint || m.url}
                      </div>
                      {m.hint && m.title && (
                        <div className="truncate text-[11px] text-[color:var(--cobalt)]">
                          focus: {m.hint}
                        </div>
                      )}
                      <div className="truncate text-[11px] text-[color:var(--muted-foreground)]">
                        {m.last_error
                          ? `Error: ${m.last_error}`
                          : m.last_checked_at
                            ? `Checked ${new Date(m.last_checked_at).toLocaleString()} · ${seen} date${seen === 1 ? "" : "s"} tracked`
                            : "Never checked"}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => refreshMonMut.mutate(m.id)}
                        disabled={busy}
                        className="rounded-full bg-[color:var(--cobalt)] px-3 py-1 text-[11px] font-bold text-[color:var(--cream)] disabled:opacity-50"
                      >
                        {busy ? "…" : "Refresh"}
                      </button>
                      <button
                        onClick={() => removeMonMut.mutate(m.id)}
                        className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold text-[color:var(--ink)]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </AppShell>
  );
}

function OrganizerCard({
  o,
  busy,
  onRefresh,
  onUnfollow,
  onSaveFilters,
}: {
  o: OrgRow;
  busy: boolean;
  onRefresh: () => void;
  onUnfollow: () => void;
  onSaveFilters: (f: { boroughs: Borough[]; hideSoldOut: boolean }) => void;
}) {
  const initial = (o.filters?.boroughs ?? []) as Borough[];
  const [boroughs, setBoroughs] = useState<Set<Borough>>(new Set(initial));
  const [hide, setHide] = useState<boolean>(o.filters?.hideSoldOut ?? true);
  const [open, setOpen] = useState(false);

  const dirty =
    hide !== (o.filters?.hideSoldOut ?? true) ||
    Array.from(boroughs).sort().join(",") !== initial.slice().sort().join(",");

  return (
    <div className="paint-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[color:var(--ink)]">
            {o.name || o.url}
          </div>
          <div className="truncate text-[11px] text-[color:var(--muted-foreground)]">
            {o.last_error
              ? `Error: ${o.last_error}`
              : o.last_checked_at
                ? `Checked ${new Date(o.last_checked_at).toLocaleString()}`
                : "Never checked"}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onRefresh}
            disabled={busy}
            className="rounded-full bg-[color:var(--cobalt)] px-3 py-1 text-[11px] font-bold text-[color:var(--cream)] disabled:opacity-50"
          >
            {busy ? "…" : "Refresh"}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold"
          >
            {open ? "Close" : "Edit"}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-[color:var(--border)] pt-3">
          <div className="flex flex-wrap gap-1.5">
            {BOROUGHS.map((b) => {
              const active = boroughs.has(b);
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    const n = new Set(boroughs);
                    if (n.has(b)) n.delete(b);
                    else n.add(b);
                    setBoroughs(n);
                  }}
                  className={
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold " +
                    (active
                      ? "border-transparent bg-[color:var(--cobalt)] text-[color:var(--cream)]"
                      : "border-[color:var(--border)] bg-white/80 text-[color:var(--ink)]")
                  }
                >
                  {b}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={hide}
              onChange={(e) => setHide(e.target.checked)}
              className="h-3.5 w-3.5 accent-[color:var(--cobalt)]"
            />
            Hide sold-out
          </label>
          <div className="flex gap-2">
            <button
              disabled={!dirty}
              onClick={() =>
                onSaveFilters({ boroughs: Array.from(boroughs), hideSoldOut: hide })
              }
              className="rounded-full bg-[color:var(--neon-pink)] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
            >
              Save filters
            </button>
            <button
              onClick={onUnfollow}
              className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold text-[color:var(--ink)]"
            >
              Unfollow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}