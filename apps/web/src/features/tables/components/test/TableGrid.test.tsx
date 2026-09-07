import React, { act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Grid: ({ children }: any) => <div>{children}</div>,
  Card: ({ children }: any) => <section>{children}</section>,
  Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  IconButton: ({ "aria-label": label, onClick, disabled }: any) => (
    <button aria-label={label} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  ),
  Select: ({ value, onChange, disabled }: any) => (
    <select
      aria-label="status"
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      <option value="AVAILABLE">AVAILABLE</option>
      <option value="OCCUPIED">OCCUPIED</option>
    </select>
  ),
  StatusBadge: ({ label }: any) => <span>{label}</span>,
}));
import { TableGrid } from "../TableGrid";
const table = (id: string, status = "AVAILABLE") =>
  ({
    id,
    name: `Table ${id}`,
    capacity: 4,
    section: "Main",
    status,
    branchId: "b1",
    publicQrToken: "q",
  }) as any;
let callbacks: IntersectionObserverCallback[] = [];
class IO {
  constructor(cb: IntersectionObserverCallback) {
    callbacks.push(cb);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}
beforeEach(() => {
  callbacks = [];
  (globalThis as any).IntersectionObserver = IO;
});
describe("TableGrid", () => {
  it("owns table edit/delete/status/QR and occupied operations", () => {
    const p = {
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onStatusChange: vi.fn(),
      onShowQr: vi.fn(),
      onTransfer: vi.fn(),
      onMerge: vi.fn(),
    };
    render(<TableGrid tables={[table("1"), table("2", "OCCUPIED")]} {...p} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit table" })[0]!);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Show table QR code" })[0]!,
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Remove table" })[0]!,
    );
    fireEvent.change(screen.getAllByLabelText("status")[0]!, {
      target: { value: "OCCUPIED" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transfer" }));
    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    expect(p.onEdit).toHaveBeenCalled();
    expect(p.onShowQr).toHaveBeenCalled();
    expect(p.onDelete).toHaveBeenCalledWith("1", "Table 1");
    expect(p.onStatusChange).toHaveBeenCalledWith("1", "OCCUPIED");
    expect(p.onTransfer).toHaveBeenCalled();
    expect(p.onMerge).toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: "Has an active order",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("owns progressive rendering for large table sets", () => {
    render(
      <TableGrid
        tables={Array.from({ length: 33 }, (_, i) => table(String(i)))}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
        onShowQr={vi.fn()}
      />,
    );
    expect(screen.getByText("Loading more tables…")).toBeTruthy();
    act(() =>
      callbacks.forEach((cb) =>
        cb([{ isIntersecting: true } as any], {} as any),
      ),
    );
    expect(screen.queryByText("Loading more tables…")).toBeNull();
  });
});
