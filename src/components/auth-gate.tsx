import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const ALLOWED_EMAIL = "alexandra.baker337@gmail.com";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "forbidden"; email: string | null }
  | { status: "ok" };

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    const evaluate = (email: string | null | undefined, hasSession: boolean) => {
      if (!mounted) return;
      if (!hasSession) return setState({ status: "signed-out" });
      if ((email ?? "").toLowerCase() !== ALLOWED_EMAIL)
        return setState({ status: "forbidden", email: email ?? null });
      setState({ status: "ok" });
    };
    supabase.auth.getSession().then(({ data }) => {
      evaluate(data.session?.user?.email, !!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      evaluate(session?.user?.email, !!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setError(result.error.message || "Sign in failed");
    }
    // if redirected, browser navigates away
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (state.status === "ok") return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col items-center justify-center px-6 text-center">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--cobalt)]">
        Private
      </p>
      <h1 className="font-display text-5xl leading-[1.05] text-[color:var(--ink)]">
        <span className="brush-underline">Activity Planner</span>
      </h1>
      <p className="mt-4 max-w-[28ch] text-sm text-[color:var(--muted-foreground)]">
        {state.status === "forbidden"
          ? `Signed in as ${state.email ?? "unknown"}, but this account isn't allowed.`
          : state.status === "loading"
            ? "Checking your session…"
            : "Sign in with Google to continue."}
      </p>

      {state.status !== "loading" && (
        <div className="mt-6 flex w-full flex-col items-center gap-3">
          {state.status === "signed-out" && (
            <button
              onClick={signIn}
              disabled={busy}
              className="paint-card flex items-center justify-center gap-3 rounded-full px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition active:scale-[0.98] disabled:opacity-60"
            >
              <GoogleMark />
              {busy ? "Opening Google…" : "Continue with Google"}
            </button>
          )}
          {state.status === "forbidden" && (
            <button
              onClick={signOut}
              className="rounded-full bg-[color:var(--ink)] px-5 py-2 text-sm font-semibold text-[color:var(--cream)]"
            >
              Sign out
            </button>
          )}
          {error && <p className="text-xs text-[color:var(--destructive)]">{error}</p>}
        </div>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.8 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.8 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5c-2 1.4-4.4 2.2-7.1 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.2 5.4l6.1 5c-.4.4 6.8-5 6.8-14.4 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}