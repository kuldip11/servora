import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryErrorState } from "../QueryErrorState";

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span>alert</span>,
  RefreshCw: () => <span>refresh</span>,
  Loader2: () => <span>loading</span>,
}));

describe("QueryErrorState", () => {
  it("renders an accessible error and retries", () => {
    const onRetry = vi.fn();
    render(
      <QueryErrorState
        title="Unable to load"
        description="Try again"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
