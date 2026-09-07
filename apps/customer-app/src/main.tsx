import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, AppErrorBoundary } from "@pos/ui";
import { CustomerApp } from "./CustomerApp";
import { customerQueryClient } from "./shared/lib/query-client";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={customerQueryClient}>
        <AppErrorBoundary appName="Servora Customer">
          <CustomerApp />
        </AppErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
