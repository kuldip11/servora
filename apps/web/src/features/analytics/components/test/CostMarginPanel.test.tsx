import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ query: {} as any }));
vi.mock("@/features/analytics/hooks/useCostMarginReport", () => ({
  useCostMarginReport: () => state.query,
}));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Badge: ({ children }: any) => <span>{children}</span>,
  SkeletonCard: () => <div>loading-card</div>,
}));
import { CostMarginPanel } from "../CostMarginPanel";
describe("CostMarginPanel", () => {
  beforeEach(() => {
    state.query = { data: [], isLoading: false };
  });
  it("owns all-branch and loading/empty states", () => {
    const { rerender } = render(<CostMarginPanel branchId="all" />);
    expect(screen.getByText(/Select a branch/)).toBeTruthy();
    state.query = { data: [], isLoading: true };
    rerender(<CostMarginPanel branchId="b1" />);
    expect(screen.getAllByText("loading-card").length).toBeGreaterThan(0);
    state.query = { data: [], isLoading: false };
    rerender(<CostMarginPanel branchId="b1" />);
    expect(screen.getByText("No menu items to report yet.")).toBeTruthy();
  });
  it("owns category filtering and margin sorting", () => {
    state.query = {
      isLoading: false,
      data: [
        {
          menuItemId: "i1",
          variantId: null,
          menuItemName: "Latte",
          variantName: null,
          categoryId: "c1",
          categoryName: "Drinks",
          price: 100,
          cost: 40,
          margin: 60,
          marginPercent: 60,
        },
        {
          menuItemId: "i2",
          variantId: null,
          menuItemName: "Toast",
          variantName: null,
          categoryId: "c1",
          categoryName: "Drinks",
          price: 50,
          cost: 40,
          margin: 10,
          marginPercent: 20,
        },
        {
          menuItemId: "i3",
          variantId: "v",
          menuItemName: "Tea",
          variantName: "Large",
          categoryId: "c2",
          categoryName: "Tea",
          price: 80,
          cost: null,
          margin: null,
          marginPercent: null,
        },
      ],
    };
    render(<CostMarginPanel branchId="b1" />);
    expect(screen.getByText(/Cost not configured/)).toBeTruthy();
    fireEvent.change(
      screen.getByLabelText("Filter margin report by category"),
      { target: { value: "c1" } },
    );
    fireEvent.change(screen.getByLabelText("Sort margin report"), {
      target: { value: "low" },
    });
    expect(screen.getByText("Toast")).toBeTruthy();
  });
});
