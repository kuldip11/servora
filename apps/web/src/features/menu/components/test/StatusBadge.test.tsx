import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  StatusBadge: ({ label, tone }: any) => <span data-tone={tone}>{label}</span>,
}));

import { StatusBadge } from "../StatusBadge";

describe("StatusBadge", () => {
  it("renders active and fallback states", () => {
    const { rerender } = render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText(/Active/i)).toBeTruthy();
    rerender(<StatusBadge status={"UNKNOWN" as never} />);
    expect(screen.getByText(/Active/i)).toBeTruthy();
  });
});
