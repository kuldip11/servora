import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Badge: ({ children }: any) => <span>{children}</span>,
  StatusBadge: ({ label }: any) => <span>{label}</span>,
}));
import { InventoryActivity } from "../InventoryActivity";
describe("InventoryActivity", () => {
  it("owns empty and transaction activity presentation", () => {
    const { rerender } = render(<InventoryActivity transactions={[] as any} />);
    expect(screen.getByText("No stock changes recorded yet")).toBeTruthy();
    rerender(
      <InventoryActivity
        transactions={
          [
            {
              id: "t1",
              transactionType: "WASTE",
              quantity: "1",
              createdAt: "2026-09-01T10:00:00Z",
              inventoryItem: { name: "Chicken", unit: "KG" },
              wasteReason: { label: "Spoilage" },
              notes: "bad",
            },
            {
              id: "t2",
              transactionType: "IN",
              quantity: "3",
              createdAt: "2026-09-01T11:00:00Z",
              inventoryItem: undefined,
              reversalOfDeductionId: "d1",
              notes: "",
            },
          ] as any
        }
      />,
    );
    expect(screen.getByText("VOID REVERSAL")).toBeTruthy();
    expect(screen.getByText("Spoilage · bad")).toBeTruthy();
  });
});
