import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ query: {} as any, refetch: vi.fn() }));
vi.mock("@/features/orders/hooks/useOrders", () => ({
  useOrders: () => state.query,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to ?? "/"}>{children}</a>,
}));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  SkeletonCard: () => <div>loading</div>,
  StatusBadge: ({ label }: any) => <span>{label}</span>,
}));
import { ActiveOrdersPanel } from "../ActiveOrdersPanel";
describe("ActiveOrdersPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: state.refetch,
    };
  });
  it("owns error retry and empty states", () => {
    state.query = { ...state.query, isError: true };
    const { rerender } = render(<ActiveOrdersPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Retry orders" }));
    expect(state.refetch).toHaveBeenCalled();
    state.query = { ...state.query, isError: false, data: [] };
    rerender(<ActiveOrdersPanel />);
    expect(screen.getByText("No active orders right now")).toBeTruthy();
  });
  it("renders only the first five active orders and links to the rest", () => {
    state.query = {
      ...state.query,
      data: Array.from({ length: 6 }, (_, i) => ({
        id: `order00000${i}`,
        status: i === 0 ? "OPEN" : "UNKNOWN",
        items: [{}],
        createdAt: new Date().toISOString(),
        totalAmount: 100,
      })),
    };
    render(<ActiveOrdersPanel />);
    expect(screen.getByText(/View all active orders/)).toBeTruthy();
  });
});
