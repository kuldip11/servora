import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StaleDataBanner } from "../StaleDataBanner";

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span>alert</span>,
  RefreshCw: () => <span>refresh</span>,
  Loader2: () => <span>loading</span>,
}));

describe("StaleDataBanner", () => {
  it("labels stale data and exposes retry", () => {
    const onRetry = vi.fn();
    render(<StaleDataBanner onRetry={onRetry} />);
    expect(screen.getByRole("status").textContent).toContain(
      "showing the latest data",
    );
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
