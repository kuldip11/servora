import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { AppErrorFallback } from "@pos/ui";

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error("Unknown route rendering error");

export const RouteErrorPage = ({ error, info, reset }: ErrorComponentProps) => {
  useEffect(() => {
    const routeError = toError(error);
    window.dispatchEvent(
      new CustomEvent("servora:react-error", {
        detail: {
          message: routeError.message,
          componentStack: info?.componentStack,
        },
      }),
    );
  }, [error, info?.componentStack]);

  return (
    <AppErrorFallback
      appName="Servora Web"
      description="This page could not be rendered safely. Try again. If the issue continues, reload the application."
      onReset={reset}
    />
  );
};
