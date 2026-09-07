import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }));
vi.mock("@/features/inventory/hooks/useAddInventoryItem", () => ({
  useAddInventoryItem: () => ({ mutate: mocks.add, isPending: false }),
}));
vi.mock("@/features/inventory/hooks/useUpdateInventoryStock", () => ({
  useUpdateInventoryStock: () => ({ mutate: mocks.update, isPending: false }),
}));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("@pos/ui", () => ({
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
        <select aria-label={label} ref={ref} {...p}>
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
        branches={[{ id: "b1", name: "Central" }]}
        onCloseAdd={close}
        onCloseUpdate={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Item name"), {
      target: { value: "Oil" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    await waitFor(() => expect(mocks.add).toHaveBeenCalled());
    const opts = mocks.add.mock.calls.at(-1)?.[1];
    act(() => opts.onSuccess());
    expect(close).toHaveBeenCalled();
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
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    const opts = mocks.update.mock.calls.at(-1)?.[1];
    act(() => opts.onSuccess());
    expect(close).toHaveBeenCalled();
  });
});
