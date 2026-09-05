import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h=vi.hoisted(()=>({render:vi.fn(),createRoot:vi.fn(),bootstrap:vi.fn()}));
vi.mock("react-dom/client",()=>({createRoot:h.createRoot}));
vi.mock("@tanstack/react-router",()=>({RouterProvider:()=> <div>router</div>}));
vi.mock("@tanstack/react-query",()=>({QueryClientProvider:({children}:any)=><>{children}</>}));
vi.mock("@tanstack/react-query-devtools",()=>({ReactQueryDevtools:()=> <div>devtools</div>}));
vi.mock("@pos/ui",()=>({ThemeProvider:({children}:any)=><>{children}</>,Toaster:()=> <div>toaster</div>}));
vi.mock("../routes",()=>({router:{}}));
vi.mock("../shared/lib/query-client",()=>({queryClient:{}}));
vi.mock("../shared/auth/bootstrap",()=>({bootstrapAuthSession:h.bootstrap}));
vi.mock("../shared/components/PerformanceProfiler",()=>({PerformanceProfiler:({children}:any)=><>{children}</>}));

describe("main bootstrap coverage",()=>{
 beforeEach(()=>{vi.resetModules();vi.clearAllMocks();document.body.innerHTML='<div id="root"></div>';h.createRoot.mockReturnValue({render:h.render});h.bootstrap.mockResolvedValue(undefined);});
 it("bootstraps auth and renders the application root",async()=>{
  await import("../main");
  await vi.waitFor(()=>expect(h.bootstrap).toHaveBeenCalledTimes(1));
  await vi.waitFor(()=>expect(h.createRoot).toHaveBeenCalledWith(document.getElementById("root")));
  expect(h.render).toHaveBeenCalledTimes(1);
 });
 it("throws when the root element is missing",async()=>{
  document.body.innerHTML="";
  await expect(import("../main")).rejects.toThrow("Root element not found");
  expect(h.bootstrap).not.toHaveBeenCalled();
 });
});
