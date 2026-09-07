/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "../AppErrorBoundary";

const BrokenView = () => {
  throw new Error("render failed");
};

describe("AppErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no rendering error occurs", () => {
    render(
      <AppErrorBoundary>
        <p>Ready</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("isolates rendering failures and reports them", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onError = vi.fn();

    render(
      <AppErrorBoundary appName="Waiter" onError={onError}>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Waiter")).toBeTruthy();
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("allows callers to reset the failed tree", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onReset = vi.fn();

    render(
      <AppErrorBoundary onReset={onReset}>
        <BrokenView />
      </AppErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
