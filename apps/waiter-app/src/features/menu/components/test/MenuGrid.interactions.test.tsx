import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ observer: null as any }));
vi.mock("@pos/ui", () => ({ Spinner: () => <span>spinner</span> }));
vi.mock("@/features/menu/components/MenuItemCard", () => ({
  MenuItemCard: ({ item, cartQty, singleCart, onTap, onQtyChange }: any) => (
    <div>
      <button onClick={onTap}>{item.name}:{cartQty}:{singleCart ? "single" : "multi"}</button>
      <button onClick={() => onQtyChange(1)}>qty-{item.id}</button>
    </div>
  ),
}));
import { MenuGrid } from "@/features/menu/components/MenuGrid";

class ObserverMock {
  cb: any;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(cb: any) { this.cb = cb; mocks.observer = this; }
}
const item = (n: number, options = false) => ({
  id: `i${n}`, name: `Item ${n}`,
  variants: options ? [{ id: "v" }] : [], modifierGroupLinks: [],
});

describe("MenuGrid interactions", () => {
  beforeEach(() => { (globalThis as any).IntersectionObserver = ObserverMock; });

  it("renders loading and both empty messages", () => {
    const p = { items: [], cart: [], isLoading: true, menuSearch: "", onItemTap: vi.fn(), onQtyChange: vi.fn() };
    const { rerender } = render(<MenuGrid {...p as any} />);
    expect(screen.getByText("spinner")).toBeTruthy();
    rerender(<MenuGrid {...p as any} isLoading={false} />);
    expect(screen.getByText("No items in this category")).toBeTruthy();
    rerender(<MenuGrid {...p as any} isLoading={false} menuSearch="pizza" />);
    expect(screen.getByText("No items match your search")).toBeTruthy();
  });

  it("aggregates cart quantity, protects option items, and loads more", () => {
    const items = Array.from({ length: 30 }, (_, i) => item(i + 1, i === 1));
    const cart: any[] = [
      { menuItemId: "i1", quantity: 2, unitPrice: 10, selectedOptions: [], modifiers: [] },
      { menuItemId: "i1", quantity: 3, unitPrice: 10, selectedOptions: [], modifiers: [] },
      { menuItemId: "i2", quantity: 1, unitPrice: 10, selectedOptions: [], modifiers: [] },
    ];
    const onItemTap = vi.fn();
    const onQtyChange = vi.fn();
    const { rerender } = render(<MenuGrid items={items as any} cart={cart} isLoading={false} menuSearch="" onItemTap={onItemTap} onQtyChange={onQtyChange} />);
    expect(screen.getByText("Item 1:5:single")).toBeTruthy();
    expect(screen.getByText("Item 2:1:multi")).toBeTruthy();
    fireEvent.click(screen.getByText("Item 1:5:single"));
    fireEvent.click(screen.getByText("qty-i1"));
    fireEvent.click(screen.getByText("qty-i2"));
    expect(onItemTap).toHaveBeenCalledWith(expect.objectContaining({ id: "i1" }));
    expect(onQtyChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Loading more menu items…")).toBeTruthy();
    act(() => mocks.observer.cb([{ isIntersecting: false }]));
    act(() => mocks.observer.cb([{ isIntersecting: true }]));
    expect(screen.getByText("Item 30:0:multi")).toBeTruthy();

    rerender(<MenuGrid items={items.slice(0, 2) as any} cart={cart} isLoading={false} menuSearch="changed" onItemTap={onItemTap} onQtyChange={onQtyChange} />);
    expect(screen.queryByText("Loading more menu items…")).toBeNull();
  });
});
