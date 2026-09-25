import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: { current: {} as any },
}));

vi.mock("@/features/orders/hooks/useOrderExplanation", () => ({
  useOrderExplanation: () => mocks.query.current,
}));

import { OrderExplainDialog } from "@/features/orders/components/OrderExplainDialog";

const explanation = {
  orderId: "order-1",
  asOf: "2026-08-30T12:00:00.000Z",
  completeHistory: true,
  historyNotice:
    "Deterministic fire-time resolver evidence is complete for every line.",
  totals: {
    subtotal: 100,
    discountAmount: 10,
    taxAmount: 5,
    serviceChargeAmount: 0,
    roundingAdjustment: 0,
    totalAmount: 95,
  },
  lines: [
    {
      orderItemId: "line-1",
      name: "Paneer Tikka",
      asOf: "2026-08-30T12:00:00.000Z",
      historicalEvidenceComplete: true,
      availabilityAtOrder: {
        effectiveStatus: "ACTIVE",
        cause: "SCHEDULE",
        branchId: "branch-1",
        channel: "STAFF",
        fulfillmentType: "DINE_IN",
        asOf: "2026-08-30T12:00:00.000Z",
        reason: "Daily window active",
      },
      pricingReplay: {
        priceSource: {
          kind: "PRICE_RULE",
          id: "rule-1",
          description: "Tuesday happy-hour rule",
        },
        baseResolvedUnitPrice: 100,
        variantDelta: 0,
        modifierDelta: 0,
        comboDelta: 0,
        promotionDelta: -10,
        loyaltyDelta: 0,
        persistedSubtotal: 100,
        payableBeforeTax: 90,
        matchesSnapshot: true,
      },
      trace: [
        {
          stage: "AVAILABILITY_RESOLVER",
          explanation: "ACTIVE: Daily window active [SCHEDULE]",
        },
        {
          stage: "PRICING_PIPELINE_STAGE_1",
          explanation: "Tuesday happy-hour rule",
        },
      ],
    },
  ],
};

describe("OrderExplainDialog", () => {
  beforeEach(() => {
    mocks.query.current = {
      data: explanation,
      isLoading: false,
      error: null,
    };
  });

  it("renders a human-readable deterministic trace", () => {
    render(<OrderExplainDialog open orderId="order-1" onClose={vi.fn()} />);

    expect(screen.getByText("Paneer Tikka")).toBeTruthy();
    expect(
      screen.getAllByText("Tuesday happy-hour rule").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("ACTIVE · SCHEDULE · STAFF/DINE_IN")).toBeTruthy();
    expect(screen.getByText("Matches snapshot")).toBeTruthy();
  });

  it("renders loading and error states from the query", () => {
    mocks.query.current = { data: undefined, isLoading: true, error: null };
    const { rerender } = render(
      <OrderExplainDialog open orderId="order-1" onClose={vi.fn()} />,
    );
    expect(document.querySelector(".animate-spin")).toBeTruthy();

    mocks.query.current = {
      data: undefined,
      isLoading: false,
      error: new Error("explain failed"),
    };
    rerender(<OrderExplainDialog open orderId="order-1" onClose={vi.fn()} />);
    expect(screen.getByText("Unable to reconstruct this order")).toBeTruthy();
    expect(screen.getByText("explain failed")).toBeTruthy();
  });
});
