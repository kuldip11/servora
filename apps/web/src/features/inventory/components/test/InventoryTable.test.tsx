import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Table: ({ columns, data, emptyTitle, emptyAction }: any) => (
    <div>
      {data.length ? (
        data.map((row: any) => (
          <div key={row.id}>
            {columns.map((column: any) => (
              <span key={column.id}>
                {column.cell ? column.cell(row) : null}
              </span>
            ))}
          </div>
        ))
      ) : (
        <div>
          {emptyTitle}
          {emptyAction}
        </div>
      )}
    </div>
  ),
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  DropdownMenu: ({ trigger, items }: any) => (
    <div>
      {trigger}
      {items.map((entry: any) => (
        <button key={entry.label} onClick={entry.onSelect}>
          {entry.label}
        </button>
      ))}
    </div>
  ),
  IconButton: (props: any) => (
    <button aria-label={props["aria-label"]}>{props["aria-label"]}</button>
  ),
  StatusBadge: ({ label }: any) => <span>{label}</span>,
}));
import { InventoryTable } from "../InventoryTable";
const item = (over: any = {}) =>
  ({
    id: "i1",
    name: "Chicken",
    unit: "KG",
    currentStock: "2",
    minimumStock: "5",
    costPerUnit: "200",
    ...over,
  }) as any;
describe("InventoryTable", () => {
  it("owns stock/status rendering and row actions", () => {
    const update = vi.fn(),
      waste = vi.fn(),
      impact = vi.fn();
    render(
      <InventoryTable
        items={[item(), item({ id: "i2", name: "Rice", currentStock: "20" })]}
        loading={false}
        onUpdateStock={update}
        onLogWaste={waste}
        onViewImpact={impact}
      />,
    );
    expect(screen.getByText("Low Stock")).toBeTruthy();
    expect(screen.getByText("In Stock")).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Update Stock" })[0]!,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Log waste" })[0]!);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Recipe impact" })[0]!,
    );
    expect(update).toHaveBeenCalled();
    expect(waste).toHaveBeenCalled();
    expect(impact).toHaveBeenCalled();
  });
  it("owns empty action", () => {
    const add = vi.fn();
    render(
      <InventoryTable
        items={[]}
        loading={false}
        onUpdateStock={vi.fn()}
        onLogWaste={vi.fn()}
        onViewImpact={vi.fn()}
        onAddItem={add}
      />,
    );
    expect(screen.getByText("No inventory items")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Add Item/ }));
    expect(add).toHaveBeenCalled();
  });
});
