import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
import { OrderActions } from "@/features/orders/components/OrderActions";

const base = {
  order: { id: "o1", status: "OPEN" } as any,
  canRequestBill: true,
  canAddItems: true,
  canCancel: true,
  allTicketsServed: false,
  isUpdatingStatus: false,
  onRequestBill: vi.fn(),
  onAddItems: vi.fn(),
  onCancel: vi.fn(),
  onTransfer: vi.fn(),
  onSplit: vi.fn(),
  onMerge: vi.fn(),
};

describe("OrderActions interactions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes every available action and confirms cancellation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<OrderActions {...base} />);
    expect(screen.getByText(/All rounds need/)).toBeTruthy();
    for (const name of ["Request Bill", "Add More Items", "Transfer Table", "Split Bill", "Merge Table", "Cancel Order"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(base.onRequestBill).toHaveBeenCalled();
    expect(base.onAddItems).toHaveBeenCalled();
    expect(base.onTransfer).toHaveBeenCalled();
    expect(base.onSplit).toHaveBeenCalled();
    expect(base.onMerge).toHaveBeenCalled();
    expect(base.onCancel).toHaveBeenCalled();
  });

  it("covers updating/served/cancel-declined states", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <OrderActions
        {...base}
        order={{ id: "o1", status: "BILL_REQUESTED" } as any}
        allTicketsServed
        isUpdatingStatus
      />,
    );
    expect(screen.getByText("Updating…")).toBeTruthy();
    expect(screen.queryByText(/All rounds need/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel Order" }));
    expect(base.onCancel).not.toHaveBeenCalled();
  });
});
