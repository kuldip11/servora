import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, Toaster, AppErrorBoundary } from "@pos/ui";
import { queryClient } from "./shared/lib/query-client";
import { WaiterApp } from "./app/WaiterApp";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary appName="Servora Waiter">
          <WaiterApp />
        </AppErrorBoundary>
        {}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
