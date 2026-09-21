import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }));
vi.mock("@/features/inventory/hooks/useAddInventoryItem", () => ({
  useAddInventoryItem: () => ({ mutateAsync: mocks.add, isPending: false }),
}));
vi.mock("@/features/inventory/hooks/useUpdateInventoryStock", () => ({
  useUpdateInventoryStock: () => ({
    mutateAsync: mocks.update,
    isPending: false,
  }),
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  FormErrorSummary: () => null,
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  Input: React.forwardRef<HTMLInputElement, any>(
    ({ label, hint, ...p }, ref) => (
      <label>
        {label}
        <input aria-label={label} ref={ref} {...p} />
        {hint ? <span>{hint}</span> : null}
      </label>
    ),
  ),
  Select: React.forwardRef<HTMLSelectElement, any>(
    ({ label, options = [], ...p }, ref) => (
      <label>
        {label}
        <select
          aria-label={label}
          ref={ref}
          {...p}
          onChange={(event) => p.onChange?.(event.target.value)}
        >
          {options.map((o: any) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    ),
  ),
}));
import { InventoryItemDialogs } from "../InventoryItemDialogs";
const stockItem = {
  id: "i1",
  name: "Chicken",
  unit: "KG",
  currentStock: "2",
} as any;
describe("InventoryItemDialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("owns add-item form including aggregate branch scope", async () => {
    const close = vi.fn();
    render(
      <InventoryItemDialogs
        addOpen
        updateItem={null}
        aggregate
        branches={[
          { id: "33333333-3333-4333-8333-333333333333", name: "Central" },
        ]}
        onCloseAdd={close}
        onCloseUpdate={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Item name"), {
      target: { value: "Oil" },
    });
    fireEvent.change(screen.getByLabelText("Current Stock"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Minimum Stock"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Reorder Point"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Cost per Unit (₹)"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText("Branch"), {
      target: { value: "33333333-3333-4333-8333-333333333333" },
    });
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Add Item" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    await waitFor(() => expect(mocks.add).toHaveBeenCalled());
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
  it("owns stock update form and success close", async () => {
    const close = vi.fn();
    render(
      <InventoryItemDialogs
        addOpen={false}
        updateItem={stockItem}
        aggregate={false}
        branches={[]}
        onCloseAdd={vi.fn()}
        onCloseUpdate={close}
      />,
    );
    fireEvent.change(screen.getByLabelText("Quantity"), {
      target: { value: "4" },
    });
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Update" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
});
