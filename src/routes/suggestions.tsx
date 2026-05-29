import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell, PageHeader } from "../components/app-shell";
import {
  acceptSuggestion,
  dismissSuggestion,
  listSuggestions,
} from "../lib/organizers.functions";
import {
  acceptMonitorSuggestion,
  dismissMonitorSuggestion,
  listMonitorSuggestions,
} from "../lib/monitors.functions";

export const Route = createFileRoute("/suggestions")({
  head: () => ({ meta: [{ title: "Suggestions — Activity Planner" }] }),
  component: SuggestionsPage,
});

type SuggestionRow = {
  id: string;
  title: string;
  url: string;
  starts_at: string | null;
  venue: string;
  neighborhood: string;
  borough: string;
  is_sold_out: boolean;
  image_url: string | null;
  followed_organizers: { name: string; url: string } | null;
};

type MonitorSuggestionRow = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  price_note: string | null;
  monitored_urls: { url: string; hint: string; title: string } | null;
};

function SuggestionsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listSuggestions);
  const accept = useServerFn(acceptSuggestion);
  const dismiss = useServerFn(dismissSuggestion);
  const listMon = useServerFn(listMonitorSuggestions);
  const acceptMon = useServerFn(acceptMonitorSuggestion);
  const dismissMon = useServerFn(dismissMonitorSuggestion);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => list(),
  });
  const { data: monRows = [] } = useQuery({
    queryKey: ["monitor-suggestions"],
    queryFn: () => listMon(),
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => accept({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suggestions"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
  const dismissMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: "not_interested" | "not_available" }) =>
      dismiss({ data: { id, reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suggestions"] }),
  });

  const acceptMonMut = useMutation({
    mutationFn: (id: string) => acceptMon({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monitor-suggestions"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
  const dismissMonMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: "not_interested" | "not_available" }) =>
      dismissMon({ data: { id, reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monitor-suggestions"] }),
  });

  const suggestions = rows as SuggestionRow[];
  const monSuggestions = monRows as MonitorSuggestionRow[];
  const total = suggestions.length + monSuggestions.length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inbox"
        title="Suggestions"
        subtitle={`${total} match${total === 1 ? "" : "es"} from your followed organizers & monitored pages.`}
      />
      <main className="space-y-3 px-5 pb-6">
        {isLoading && (
          <p className="text-xs text-[color:var(--muted-foreground)]">Loading…</p>
        )}
        {!isLoading && total === 0 && (
          <p className="text-xs text-[color:var(--muted-foreground)]">
            No new matches. Add organizers in{" "}
            <Link to="/settings" className="underline">Settings</Link>.
          </p>
        )}
        {monSuggestions.map((s) => {
          const busy =
            (acceptMonMut.isPending && acceptMonMut.variables === s.id) ||
            (dismissMonMut.isPending && dismissMonMut.variables?.id === s.id);
          const mon = s.monitored_urls;
          const label = mon?.title || mon?.hint || mon?.url || "Watched page";
          return (
            <div key={`mon-${s.id}`} className="paint-card p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={mon?.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-sm font-semibold text-[color:var(--ink)] hover:underline"
                  >
                    New date · {label}
                  </a>
                  <div className="mt-0.5 text-[11px] text-[color:var(--muted-foreground)]">
                    {new Date(s.starts_at).toLocaleString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {s.price_note && <span> · {s.price_note}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => acceptMonMut.mutate(s.id)}
                  disabled={busy}
                  className="rounded-full bg-[color:var(--neon-pink)] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  Add to library
                </button>
                <button
                  onClick={() => dismissMonMut.mutate({ id: s.id, reason: "not_interested" })}
                  disabled={busy}
                  className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold text-[color:var(--ink)] disabled:opacity-50"
                >
                  Not interested
                </button>
                <button
                  onClick={() => dismissMonMut.mutate({ id: s.id, reason: "not_available" })}
                  disabled={busy}
                  className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold text-[color:var(--ink)] disabled:opacity-50"
                >
                  Can't make it
                </button>
              </div>
            </div>
          );
        })}
        {suggestions.map((s) => {
          const busy =
            (acceptMut.isPending && acceptMut.variables === s.id) ||
            (dismissMut.isPending && dismissMut.variables?.id === s.id);
          return (
            <div key={s.id} className="paint-card p-3">
              <div className="flex items-start gap-3">
                {s.image_url && (
                  <img
                    src={s.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 text-sm font-semibold text-[color:var(--ink)] hover:underline"
                  >
                    {s.title}
                  </a>
                  <div className="mt-0.5 text-[11px] text-[color:var(--muted-foreground)]">
                    {s.followed_organizers?.name && (
                      <span>{s.followed_organizers.name} · </span>
                    )}
                    {s.starts_at
                      ? new Date(s.starts_at).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Date TBD"}
                    {(s.venue || s.neighborhood) && (
                      <span>
                        {" · "}
                        {[s.venue, s.neighborhood].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {s.is_sold_out && (
                      <span className="ml-1 text-[color:var(--neon-pink)]">· sold out</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => acceptMut.mutate(s.id)}
                  disabled={busy}
                  className="rounded-full bg-[color:var(--neon-pink)] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                >
                  Add to library
                </button>
                <button
                  onClick={() => dismissMut.mutate({ id: s.id, reason: "not_interested" })}
                  disabled={busy}
                  className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold text-[color:var(--ink)] disabled:opacity-50"
                >
                  Not interested
                </button>
                <button
                  onClick={() => dismissMut.mutate({ id: s.id, reason: "not_available" })}
                  disabled={busy}
                  className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-[11px] font-bold text-[color:var(--ink)] disabled:opacity-50"
                >
                  Can't make it
                </button>
              </div>
            </div>
          );
        })}
      </main>
    </AppShell>
  );
}