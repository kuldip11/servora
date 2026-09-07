import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ Outlet: () => <div>outlet</div> }));
import { RootLayout } from "../layout/RootLayout";
import { PerformanceProfiler } from "../PerformanceProfiler";

describe("runtime shell", () => {
  it("renders root layout and performance wrapper", () => {
    render(<RootLayout />); expect(screen.getByText("outlet")).toBeTruthy();
    render(<PerformanceProfiler id="x"><span>child</span></PerformanceProfiler>); expect(screen.getByText("child")).toBeTruthy();
  });
  it("logs slow profiler renders", () => {
    const debug=vi.spyOn(console,"debug").mockImplementation(()=>{});
    const ReactAny=React as any; const original=ReactAny.Profiler;
    ReactAny.Profiler=({onRender,children}:any)=>{ onRender("x","mount",20,0,10,35); return <>{children}</>; };
    render(<PerformanceProfiler id="x"><span>slow</span></PerformanceProfiler>); expect(screen.getByText("slow")).toBeTruthy();
    ReactAny.Profiler=original; debug.mockRestore();
  });
});
