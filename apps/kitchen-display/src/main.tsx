import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, Toaster, AppErrorBoundary } from "@pos/ui";
import { queryClient } from "./shared/lib/query-client";
import { KitchenApp } from "./features/kitchen";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    {}
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary appName="Servora Kitchen">
          <KitchenApp />
        </AppErrorBoundary>
        {}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
