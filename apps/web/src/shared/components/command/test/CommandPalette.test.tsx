import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  has: vi.fn((permission: string) => permission !== "audit:read"),
}));

vi.mock("@/shared/auth/permissions", () => ({
  usePermissions: () => ({ has: mocks.has }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, onClick, ...props }: any) => (
    <a href={to} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@pos/ui", () => ({
  Dialog: ({ open, onClose, title, children }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button type="button" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}));

import { CommandPalette } from "../CommandPalette";

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it("opens from Ctrl+K and filters commands", () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(screen.getByRole("dialog", { name: "Search Servora" })).toBeTruthy();
    const search = screen.getByLabelText("Search commands");
    fireEvent.change(search, { target: { value: "inventory" } });

    expect(screen.getByRole("link", { name: /Open inventory/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Open orders/ })).toBeNull();
  });

  it("does not expose commands the user cannot access", () => {
    render(<CommandPalette />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open command palette" }),
    );

    expect(screen.queryByRole("link", { name: /Open audit log/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Open orders/ })).toBeTruthy();
  });

  it("shows an empty state for unmatched search", () => {
    render(<CommandPalette />);
    fireEvent.click(
      screen.getByRole("button", { name: "Open command palette" }),
    );
    fireEvent.change(screen.getByLabelText("Search commands"), {
      target: { value: "does-not-exist" },
    });

    expect(screen.getByText(/No commands match/)).toBeTruthy();
  });
});
