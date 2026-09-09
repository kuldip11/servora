import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import {
  bootstrapAuthSession,
  type AuthBootstrapResult,
} from "@/shared/auth/bootstrap";

type BootstrapStatus = "loading" | "slow" | "ready" | "unavailable";

interface AppBootstrapProps {
  children: ReactNode;
}

const SLOW_START_DELAY_MS = 4_000;

export const AppBootstrap = ({ children }: AppBootstrapProps) => {
  const [status, setStatus] = useState<BootstrapStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const slowTimer = window.setTimeout(() => {
      if (active) setStatus("slow");
    }, SLOW_START_DELAY_MS);

    const bootstrap = async () => {
      const result: AuthBootstrapResult = await bootstrapAuthSession();
      if (!active) return;

      window.clearTimeout(slowTimer);
      setStatus(result === "unavailable" ? "unavailable" : "ready");
    };

    void bootstrap();

    return () => {
      active = false;
      window.clearTimeout(slowTimer);
    };
  }, [attempt]);

  if (status === "ready") return <>{children}</>;

  if (status === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-surface text-danger">
            <WifiOff className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-text-primary">
            Unable to connect
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Servora couldn&apos;t reach the service. Check your connection and try
            again.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </section>
      </main>
    );
  }

  const slow = status === "slow";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section
        className="w-full max-w-md text-center"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-md">
          S
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-text-primary">
          Servora
        </h1>
        <LoaderCircle
          className="mx-auto mt-8 h-7 w-7 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="mt-5 text-base font-medium text-text-primary">
          {slow ? "Connecting to Servora services…" : "Preparing your workspace…"}
        </p>
        <p className="mx-auto mt-2 min-h-10 max-w-sm text-sm leading-5 text-text-secondary">
          {slow
            ? "This is taking a little longer than usual. Your workspace will open as soon as the service is ready."
            : "Securely restoring your session and workspace."}
        </p>
      </section>
    </main>
  );
};
