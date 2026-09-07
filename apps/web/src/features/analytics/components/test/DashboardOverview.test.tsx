import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ query: {} as any, refetch: vi.fn() }));
vi.mock("@/features/analytics/hooks/useDashboardStats", () => ({
  useDashboardStats: () => state.query,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={String(to)}>{children}</a>,
}));
vi.mock("@pos/ui", () => ({
  Grid: ({ children }: any) => <div>{children}</div>,
  Card: ({ children }: any) => <section>{children}</section>,
  StatCard: ({ title, value }: any) => (
    <div>
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  SkeletonCard: () => <div>loading-card</div>,
}));
import { DashboardOverview } from "../DashboardOverview";

describe("DashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.query = {
      data: undefined,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: state.refetch,
    };
  });
  it("owns loading and retry states", () => {
    state.query = { ...state.query, isLoading: true, isError: true };
    render(<DashboardOverview scopeLabel="Selected branch" />);
    expect(screen.getAllByText("loading-card")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.refetch).toHaveBeenCalled();
  });
  it("renders operational stats and attention state", () => {
    state.query = {
      ...state.query,
      data: {
        totalOrdersToday: 12,
        revenueToday: 1200,
        activeOrders: 2,
        lowStockAlerts: 1,
        averageOrderValue: 100,
        paidOrdersToday: 10,
        cancelledOrdersToday: 1,
      },
    };
    render(<DashboardOverview scopeLabel="Selected branch" />);
    expect(screen.getByText("Operations need attention")).toBeTruthy();
    expect(screen.getByText("Orders today")).toBeTruthy();
    expect(screen.getByText("Low stock")).toBeTruthy();
  });
  it("renders clear state when there are no operational alerts", () => {
    state.query = {
      ...state.query,
      data: {
        totalOrdersToday: 1,
        revenueToday: 1,
        activeOrders: 0,
        lowStockAlerts: 0,
        averageOrderValue: 1,
        paidOrdersToday: 1,
        cancelledOrdersToday: 0,
      },
    };
    render(<DashboardOverview scopeLabel="Selected branch" />);
    expect(screen.getByText("Operations look clear")).toBeTruthy();
  });
});
