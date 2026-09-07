import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ Outlet: () => <div>outlet</div> }));
import { RootLayout } from "../RootLayout";

describe("RootLayout", () => {
  it("renders the current route outlet", () => {
    render(<RootLayout />);
    expect(screen.getByText("outlet")).toBeTruthy();
  });
});
