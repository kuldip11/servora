import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderExplainDialog } from "@/features/orders/components/OrderExplainDialog";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: api.get },
  extractApiError: (error: unknown) =>
    error instanceof Error ? error.message : "Request failed",
}));

describe("OrderExplainDialog", () => {
  it("explains price, availability, order state, and inventory movement", async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: {
          orderId: "order-1",
          asOf: "2026-08-30T12:00:00.000Z",
          completeHistory: true,
          historyNotice:
            "Deterministic fire-time resolver evidence is complete for every line.",
          orderState: {
            currentState: "OPEN",
            explanation: "Waiting on kitchen ticket #2 (Paneer Tikka).",
            blockingTicket: {
              ticketId: "ticket-2",
              ticketNumber: 2,
              status: "PREPARING",
              stationNames: ["Grill"],
              itemNames: ["Paneer Tikka"],
              firedAt: "2026-08-30T11:50:00.000Z",
              elapsedMinutes: 14,
              targetMinutes: 10,
              overdue: true,
            },
            tickets: [],
          },
          inventoryMovements: [
            {
              deductionId: "deduction-1",
              inventoryItemName: "Paneer",
              menuItemName: "Paneer Tikka",
              quantitySold: 2,
              quantityDeducted: 0.4,
              deductionPerUnit: 0.2,
              unit: "KG",
              transactionType: "RECIPE_CONSUMPTION",
              wasShort: false,
              deductedAt: "2026-08-30T12:00:00.000Z",
              reversedAt: null,
            },
          ],
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
              priceBreakdown: [
                {
                  kind: "BASE_PRICE",
                  label: "Rule-resolved base price",
                  amount: 100,
                  source: "Tuesday happy-hour rule",
                },
                {
                  kind: "PROMOTION",
                  label: "Promotion",
                  amount: -10,
                  source: "Happy hour",
                },
              ],
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
              ],
            },
          ],
        },
      },
    });

    render(<OrderExplainDialog open orderId="order-1" onClose={vi.fn()} />);

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith("/orders/order-1/explain"),
    );
    expect(await screen.findByText("Why this price?")).toBeTruthy();
    expect(screen.getByText("Why is the order in this state?")).toBeTruthy();
    expect(
      screen.getByText("Waiting on kitchen ticket #2 (Paneer Tikka)."),
    ).toBeTruthy();
    expect(screen.getByText("Grill")).toBeTruthy();
    expect(screen.getByText("14m")).toBeTruthy();
    expect(screen.getByText("10m")).toBeTruthy();
    expect(screen.getByText("Tuesday happy-hour rule")).toBeTruthy();
    expect(screen.getByText(/Source: SCHEDULE/)).toBeTruthy();
    expect(screen.getByText("Why did inventory move?")).toBeTruthy();
    expect(screen.getByText(/Paneer decreased by/)).toBeTruthy();
    expect(screen.getByText("0.2 KG")).toBeTruthy();
  });
});
