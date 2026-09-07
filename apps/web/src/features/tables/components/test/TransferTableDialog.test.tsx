import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transfer: { mutate: vi.fn(), isPending: false },
}));
vi.mock("@/features/orders/hooks/useTransferTable", () => ({
  useTransferTable: () => mocks.transfer,
}));
vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, value, onChange }: any) => (
    <label>
      {label}
      <input aria-label={label} value={value} onChange={onChange} />
    </label>
  ),
}));

import { TransferTableDialog } from "../TableOperationsDialogs";
const table = (id: string, status = "AVAILABLE") =>
  ({ id, name: `Table ${id}`, status, branchId: "b1" }) as any;
const order = (id: string, tableId: string) => ({ id, tableId }) as any;

describe("TransferTableDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("owns destination/reason state and mutation", () => {
    render(
      <TransferTableDialog
        source={table("1", "OCCUPIED")}
        tables={[table("1", "OCCUPIED"), table("2")]}
        openOrders={[order("o1", "1")]}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Move" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transfer" }));
    expect(mocks.transfer.mutate).toHaveBeenCalledWith(
      { orderId: "o1", newTableId: "2", reason: "Move" },
      expect.any(Object),
    );
  });

  it("disables transfer when no open order exists", () => {
    render(
      <TransferTableDialog
        source={table("1", "OCCUPIED")}
        tables={[table("2")]}
        openOrders={[]}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/No open order/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Transfer" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
