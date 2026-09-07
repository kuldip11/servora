import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ branchId: "b1" }));
vi.mock("@/store/auth", () => ({
  useAuthStore: (select: any) => select({ branchId: state.branchId }),
}));
vi.mock("@/features/analytics/hooks/useDashboardRealtimeSync", () => ({
  useDashboardRealtimeSync: vi.fn(),
}));
vi.mock("@/features/analytics/components/DashboardOverview", () => ({
  DashboardOverview: () => <div>overview</div>,
}));
vi.mock("@/features/analytics/components/DashboardSalesInsights", () => ({
  DashboardSalesInsights: () => <div>sales</div>,
}));
vi.mock("@/features/analytics/components/CostMarginPanel", () => ({
  CostMarginPanel: () => <div>margins</div>,
}));
vi.mock("@/features/analytics/components/ActiveOrdersPanel", () => ({
  ActiveOrdersPanel: () => <div>active-orders</div>,
}));
vi.mock("@/features/analytics/components/DashboardQuickActions", () => ({
  DashboardQuickActions: () => <div>quick-actions</div>,
}));
vi.mock("@pos/ui", () => ({
  Page: ({ children }: any) => <main>{children}</main>,
  PageHeader: ({ title, actions }: any) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
  Badge: ({ children }: any) => <span>{children}</span>,
  Grid: ({ children }: any) => <div>{children}</div>,
}));
import { DashboardPage } from "../DashboardPage";
describe("DashboardPage", () => {
  it("composes the dashboard feature sections for the current scope", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Owner dashboard")).toBeTruthy();
    expect(screen.getByText("Selected branch")).toBeTruthy();
    for (const text of [
      "overview",
      "sales",
      "margins",
      "active-orders",
      "quick-actions",
    ])
      expect(screen.getByText(text)).toBeTruthy();
  });
});
