import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
}));
import { OrderSidebar } from "../OrderSidebar";
describe("OrderSidebar", () => {
  it("owns order info, add-item and status transition actions", () => {
    const mutate = vi.fn(),
      add = vi.fn(),
      cancel = vi.fn();
    render(
      <OrderSidebar
        order={
          { type: "DINE_IN", table: { name: "T1" }, notes: "No onions" } as any
        }
        transitions={[
          { label: "Close", next: "CLOSED" },
          { label: "Cancel", next: "CANCELLED" },
        ]}
        canAddItems
        updateStatusMutation={{ mutate, isPending: false } as any}
        onAddItems={add}
        onCancel={cancel}
      />,
    );
    expect(screen.getByText(/Table:/)).toBeTruthy();
    expect(screen.getByText("No onions")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Add More Items/ }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(add).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith({ status: "CLOSED" });
    expect(cancel).toHaveBeenCalled();
  });
});
