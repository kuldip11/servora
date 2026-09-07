import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
}));
vi.mock("../OrderStatusBadge", () => ({
  OrderStatusBadge: ({ status }: any) => <span>{status}</span>,
}));
import { OrderStatusHistory } from "../OrderStatusHistory";
describe("OrderStatusHistory", () => {
  it("owns status history reasons and cancellation labels", () => {
    render(
      <OrderStatusHistory
        order={
          {
            statusHistory: [
              {
                id: "h1",
                newStatus: "CANCELLED",
                changedAt: "2026-09-01T10:00:00Z",
                reason: "Guest request",
                cancellationReason: { label: "Changed mind" },
              },
            ],
          } as any
        }
      />,
    );
    expect(screen.getByText("CANCELLED")).toBeTruthy();
    expect(screen.getByText(/Guest request/)).toBeTruthy();
    expect(screen.getByText(/Changed mind/)).toBeTruthy();
  });
});
