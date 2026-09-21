import { Component, type ErrorInfo, type ReactNode } from "react";

export interface AppErrorFallbackProps {
  appName?: string | undefined;
  title?: string;
  description?: string;
  onReset?: () => void;
  resetLabel?: string;
  showReload?: boolean;
}

export const AppErrorFallback = ({
  appName = "Servora",
  title = "Something went wrong",
  description =
    "This screen could not be rendered safely. Try again. If the issue continues, reload the application.",
  onReset,
  resetLabel = "Try again",
  showReload = true,
}: AppErrorFallbackProps) => (
  <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section
      role="alert"
      aria-labelledby="app-error-title"
      className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 text-center shadow-sm"
    >
      <p className="text-sm font-medium text-text-secondary">{appName}</p>
      <h1
        id="app-error-title"
        className="mt-2 text-2xl font-semibold text-text-primary"
      >
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {resetLabel}
          </button>
        ) : null}
        {showReload ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-primary"
          >
            Reload app
          </button>
        ) : null}
      </div>
    </section>
  </main>
);

export interface AppErrorBoundaryProps {
  children: ReactNode;
  appName?: string | undefined;
  onError?: (error: Error, info: ErrorInfo) => void;
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("servora:react-error", {
          detail: {
            message: error.message,
            componentStack: info.componentStack ?? undefined,
          },
        }),
      );
    }
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <AppErrorFallback
        appName={this.props.appName}
        onReset={this.handleReset}
      />
    );
  }
}
