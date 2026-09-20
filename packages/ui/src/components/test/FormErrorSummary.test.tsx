import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormErrorSummary } from "../FormErrorSummary";

vi.mock("lucide-react", () => ({
  AlertTriangle: () => <span>alert</span>,
}));

describe("FormErrorSummary", () => {
  it("renders unique form-level messages accessibly", () => {
    render(
      <FormErrorSummary
        messages={["Menu is inactive", "Menu is inactive", "Try another menu"]}
      />,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Please review the form")).toBeTruthy();
    expect(screen.getAllByText("Menu is inactive")).toHaveLength(1);
    expect(screen.getByText("Try another menu")).toBeTruthy();
  });

  it("renders nothing without usable messages", () => {
    const { container } = render(<FormErrorSummary messages={["", "  "]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
