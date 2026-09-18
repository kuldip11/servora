import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, AppErrorBoundary, ConnectivityBanner } from "@pos/ui";
import { CustomerApp } from "./CustomerApp";
import { customerQueryClient } from "./shared/lib/query-client";
import "./index.css";
import { resolveFrontendTelemetryEndpoint, startFrontendTelemetry } from "@pos/observability";

startFrontendTelemetry({
  app: "servora-customer",
  sampleRate: import.meta.env.PROD ? 0.25 : 1,
  endpoint: resolveFrontendTelemetryEndpoint(
    import.meta.env.VITE_API_URL as string | undefined,
    import.meta.env.VITE_FRONTEND_TELEMETRY_URL as string | undefined,
  ),
  ...(import.meta.env.DEV
    ? { onEvent: (event) => console.debug("[telemetry]", event) }
    : {}),
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={customerQueryClient}>
        <ConnectivityBanner />
        <AppErrorBoundary appName="Servora Customer">
          <CustomerApp />
        </AppErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
