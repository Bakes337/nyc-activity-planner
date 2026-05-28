import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "../components/app-shell";
import { ACTIVITIES, CATEGORY_META, nextDate, formatDate } from "../lib/data";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Activity Planner" },
      {
        name: "description",
        content:
          "Ask your library what to do tonight, this weekend, or for an anniversary.",
      },
    ],
  }),
  component: ChatPage,
});

interface Msg {
  role: "user" | "assistant";
  text: string;
  cards?: string[];
}

const SEED_MESSAGES: Msg[] = [
  {
    role: "assistant",
    text:
      "Hi — I can sift through your bookmarked ideas. Try \"something cheap this weekend in Brooklyn\" or \"a chill date night\".",
  },
];

const SUGGESTIONS = [
  "What's cheap this weekend?",
  "Date night in Brooklyn",
  "Something outdoors tomorrow",
  "Splurge for an anniversary",
];

function mockAnswer(q: string): Msg {
  const lower = q.toLowerCase();
  let picks = ACTIVITIES;
  if (lower.includes("cheap") || lower.includes("free"))
    picks = picks.filter((a) => a.priceTier === "free" || a.priceTier === "$");
  if (lower.includes("brooklyn"))
    picks = picks.filter((a) => a.borough === "Brooklyn");
  if (lower.includes("outdoor"))
    picks = picks.filter((a) => a.category === "active");
  if (lower.includes("date"))
    picks = picks.filter((a) =>
      ["film", "food", "music", "theater"].includes(a.category),
    );
  if (lower.includes("splurge") || lower.includes("anniversary"))
    picks = picks.filter((a) => a.priceTier === "$$$");
  if (lower.includes("weekend")) {
    picks = picks.filter((a) => {
      const n = nextDate(a);
      if (!n) return a.kind === "timeless";
      const day = new Date(n.startsAt).getDay();
      return day === 0 || day === 6;
    });
  }
  picks = picks.slice(0, 3);
  const intro = picks.length
    ? `Here are ${picks.length} from your library that fit:`
    : "Nothing in your library matches yet — want to add one?";
  return { role: "assistant", text: intro, cards: picks.map((p) => p.id) };
}

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>(SEED_MESSAGES);
  const [input, setInput] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", text };
    const reply = mockAnswer(text);
    setMessages((m) => [...m, userMsg, reply]);
    setInput("");
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Concierge"
        title="Ask your library"
        subtitle="A painterly oracle for your bookmarked ideas."
      />

      <main className="flex-1 space-y-3 px-4 pb-40">
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-snug shadow-sm " +
                (m.role === "user"
                  ? "bg-[color:var(--cobalt)] text-[color:var(--cream)]"
                  : "bg-white text-[color:var(--ink)]")
              }
            >
              {m.text}
              {m.cards && m.cards.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.cards.map((id) => {
                    const a = ACTIVITIES.find((x) => x.id === id)!;
                    const meta = categoryMeta(a.category);
                    const n = nextDate(a);
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--cream)] px-3 py-2"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: meta.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm text-[color:var(--ink)]">
                            {a.title}
                          </p>
                          <p className="truncate text-[11px] text-[color:var(--muted-foreground)]">
                            {a.venue} · {n ? formatDate(n.startsAt) : "anytime"} · {a.priceTier}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </main>

      <div className="fixed inset-x-0 bottom-24 z-10 mx-auto w-full max-w-[440px] px-3">
        <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="shrink-0 rounded-full border border-[color:var(--border)] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[color:var(--ink)] backdrop-blur"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="paint-card flex items-center gap-2 px-3 py-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your library…"
            className="w-full bg-transparent text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-[color:var(--neon-pink)] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white"
          >
            Ask
          </button>
        </form>
      </div>
    </AppShell>
  );
}