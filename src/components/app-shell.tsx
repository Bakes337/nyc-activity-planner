import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import { Library, Calendar, MessageCircle, Music } from "lucide-react";

const TABS = [
  { to: "/", label: "Library", Icon: BookOpen },
  { to: "/calendar", label: "Calendar", Icon: Calendar },
  { to: "/chat", label: "Chat", Icon: MessageCircle },
  { to: "/playlists", label: "Playlists", Icon: Music },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col pb-28">
      {children}

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[440px] px-3 pb-3">
        <div className="paint-card relative flex items-center justify-around gap-1 px-2 py-2">
          {TABS.map((t, i) => {
            const active = path === t.to || (t.to === "/" && path === "/");
            // insert the Add (+) action between Calendar (i=1) and Chat (i=2)
            const showAddBefore = i === 2;
            return (
              <Fragment key={t.to}>
                {showAddBefore && (
                  <Link
                    to="/add"
                    aria-label="Add activity"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl font-light text-[color:var(--cream)] shadow-[0_8px_18px_-6px_rgba(255,61,165,0.55)] ring-2 ring-[color:var(--cream)] transition active:scale-95"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, #FF7DC4 0%, var(--neon-pink) 60%, #C81E7E 100%)",
                    }}
                  >
                    +
                  </Link>
                )}
              <div className="flex flex-1 justify-center">
                <Link
                  to={t.to}
                  className={
                    "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold tracking-wide transition " +
                    (active
                      ? "text-[color:var(--cobalt)]"
                      : "text-[color:var(--muted-foreground)] hover:text-[color:var(--ink)]")
                  }
                >
                  <t.Icon size={18} strokeWidth={2.5} className="leading-none" />
                  <span>{t.label}</span>
                  {active && (
                    <span
                      className="mt-0.5 h-[3px] w-5 rounded-full"
                      style={{ background: "var(--neon-pink)" }}
                    />
                  )}
                </Link>
              </div>
              </Fragment>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="relative px-5 pb-3 pt-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--cobalt)]">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl leading-[1.05] text-[color:var(--ink)]">
            <span className="brush-underline">{title}</span>
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-[28ch] text-sm text-[color:var(--muted-foreground)]">
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}