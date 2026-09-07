import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider, Toaster, AppErrorBoundary } from "@pos/ui";
import { router } from "./routes";
import { queryClient } from "./shared/lib/query-client";
import "./index.css";
import { bootstrapAuthSession } from "./shared/auth/bootstrap";
import { PerformanceProfiler } from "./shared/components/PerformanceProfiler";

const root = document.getElementById("root") as HTMLElement | null;
if (!root) throw new Error("Root element not found");
const rootElement: HTMLElement = root;

const start = async () => {
  await bootstrapAuthSession();

  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AppErrorBoundary appName="Servora Web">
            <PerformanceProfiler id="web-router">
              <RouterProvider router={router} />
            </PerformanceProfiler>
          </AppErrorBoundary>
          {}
          <Toaster />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  );
};

void start();
