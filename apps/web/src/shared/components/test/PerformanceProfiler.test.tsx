import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const profilerState = vi.hoisted(() => ({ actualDuration: 1 }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    Profiler: ({ id, onRender, children }: React.ProfilerProps) => {
      onRender(id, "mount", profilerState.actualDuration, 0, 10, 35);
      return <>{children}</>;
    },
  };
});

import { PerformanceProfiler } from "../PerformanceProfiler";

describe("PerformanceProfiler", () => {
  beforeEach(() => {
    profilerState.actualDuration = 1;
    vi.restoreAllMocks();
  });

  it("renders children", () => {
    render(
      <PerformanceProfiler id="x">
        <span>child</span>
      </PerformanceProfiler>,
    );

    expect(screen.getByText("child")).toBeTruthy();
  });

  it("logs slow profiler renders", () => {
    profilerState.actualDuration = 20;
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});

    render(
      <PerformanceProfiler id="x">
        <span>slow</span>
      </PerformanceProfiler>,
    );

    expect(screen.getByText("slow")).toBeTruthy();
    expect(debug).toHaveBeenCalledWith(
      "[perf]",
      expect.objectContaining({
        id: "x",
        phase: "mount",
        actualDuration: 20,
      }),
    );
  });
});
