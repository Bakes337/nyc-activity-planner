import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TABS = [
  { to: "/", label: "Library", icon: "▦" },
  { to: "/calendar", label: "Calendar", icon: "▤" },
  { to: "/chat", label: "Chat", icon: "✺" },
  { to: "/playlists", label: "Playlists", icon: "♪" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { location } = useRouterState();
  const path = location.pathname;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col pb-28">
      {children}

      {/* Floating Action Button */}
      <Link
        to="/add"
        aria-label="Add activity"
        className="fixed bottom-[5.25rem] left-1/2 z-30 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-3xl font-light text-[color:var(--cream)] shadow-[0_12px_28px_-8px_rgba(255,61,165,0.55)] ring-4 ring-[color:var(--cream)] transition active:scale-95"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #FF7DC4 0%, var(--neon-pink) 60%, #C81E7E 100%)",
        }}
      >
        +
      </Link>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[440px] px-3 pb-3">
        <div className="paint-card relative flex items-center justify-around gap-1 px-2 py-2">
          {TABS.map((t, i) => {
            const active = path === t.to || (t.to === "/" && path === "/");
            // leave a gap in the middle for the FAB
            const isMidGap = i === 2;
            return (
              <div key={t.to} className="flex flex-1 justify-center">
                {isMidGap && <span className="w-10" aria-hidden />}
                <Link
                  to={t.to}
                  className={
                    "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold tracking-wide transition " +
                    (active
                      ? "text-[color:var(--cobalt)]"
                      : "text-[color:var(--muted-foreground)] hover:text-[color:var(--ink)]")
                  }
                >
                  <span className="text-base leading-none">{t.icon}</span>
                  <span>{t.label}</span>
                  {active && (
                    <span
                      className="mt-0.5 h-[3px] w-5 rounded-full"
                      style={{ background: "var(--neon-pink)" }}
                    />
                  )}
                </Link>
              </div>
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
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-44 paint-wash opacity-80"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 30%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 30%, transparent 100%)",
        }}
      />
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