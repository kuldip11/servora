import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  bulkClear: vi.fn(),
  observerCallback: null as IntersectionObserverCallback | null,
}));

vi.mock("lucide-react", () => ({
  CheckSquare: () => null,
  Square: () => null,
  Copy: () => null,
  Trash2: () => null,
  ToggleLeft: () => null,
  ToggleRight: () => null,
  Flame: () => null,
  Eye: () => null,
  EyeOff: () => null,
  Plus: () => null,
  ChevronDown: () => null,
  ChevronRight: () => null,
}));

vi.mock("@/features/menu/components/FoodTypeDot", () => ({
  FoodTypeDot: ({ type }: { type: string }) => <span>{type}</span>,
}));
vi.mock("@/features/menu/components/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
vi.mock("@/features/menu/components/PublishBadge", () => ({
  PublishBadge: ({ isPublished }: { isPublished: boolean }) => (
    <span>{isPublished ? "Published" : "Draft"}</span>
  ),
}));
vi.mock("@/features/menu/components/BulkActionsToolbar", () => ({
  BulkActionsToolbar: ({ selectedIds, onClear }: { selectedIds: string[]; onClear: () => void }) => (
    <div>
      <span>Bulk {selectedIds.length}</span>
      <button onClick={onClear}>Clear bulk</button>
    </div>
  ),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div><h3>{title}</h3><p>{description}</p></div>
  ),
  Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  IconButton: ({ "aria-label": ariaLabel, onClick }: { "aria-label": string; onClick: () => void }) => (
    <button aria-label={ariaLabel} onClick={onClick}>{ariaLabel}</button>
  ),
  Spinner: () => <span>Loading spinner</span>,
  SearchInput: ({ value, onChange, onClear, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }) => (
    <div>
      <input value={value} onChange={onChange} {...props} />
      <button onClick={onClear}>Clear search</button>
    </div>
  ),
  SelectMenu: ({ "aria-label": ariaLabel, value, onChange, options }: { "aria-label": string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) => (
    <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
  FilterBar: ({ children, onClearAll }: { children: React.ReactNode; onClearAll?: () => void }) => (
    <div>{children}{onClearAll && <button onClick={onClearAll}>Clear filters</button>}</div>
  ),
  Modal: ({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) => open ? (
    <div role="dialog"><h2>{title}</h2>{children}<button onClick={onClose}>Close modal</button></div>
  ) : null,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

import { MenuItemsContent, type MenuItemsContentProps } from "../MenuItemsContent";
import type { MenuItem } from "@pos/types";

const baseItem = {
  id: "item-1",
  categoryId: "cat-1",
  name: "Masala Tea",
  description: "Spiced tea",
  basePrice: "120",
  taxRate: "5",
  foodType: "VEG",
  spiceLevel: "MILD",
  status: "ACTIVE",
  isPublished: false,
  manualOverrideStatus: null,
  manualOverrideReason: null,
  availabilityReason: null,
  variants: [],
  tagLinks: [],
} as unknown as MenuItem;

const makeProps = (overrides: Partial<MenuItemsContentProps> = {}): MenuItemsContentProps => ({
  itemSearch: "",
  setItemSearch: vi.fn(),
  selectMode: false,
  selectedIds: [],
  categories: [{ id: "cat-1", name: "Drinks", menuItems: [baseItem] }] as never,
  tags: [],
  isLoading: false,
  foodTypeFilter: "ALL",
  statusFilter: "ALL",
  publishFilter: "ALL",
  setFoodTypeFilter: vi.fn(),
  setStatusFilter: vi.fn(),
  setPublishFilter: vi.fn(),
  setSelectedIds: vi.fn(),
  setItemForm: vi.fn(),
  toggleAvailMutation: { mutate: vi.fn() },
  deleteItemMutation: { mutate: vi.fn() },
  duplicateItemMutation: { mutate: vi.fn() },
  publishMutation: { mutate: vi.fn() },
  ...overrides,
});

describe("MenuItemsContent coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.observerCallback = null;
    class Observer {
      constructor(callback: IntersectionObserverCallback) { mocks.observerCallback = callback; }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    vi.stubGlobal("IntersectionObserver", Observer);
  });

  it("renders loading and empty category states", () => {
    const { rerender } = render(<MenuItemsContent {...makeProps({ isLoading: true })} />);
    expect(screen.getByText("Loading spinner")).toBeTruthy();
    rerender(<MenuItemsContent {...makeProps({ categories: [], isLoading: false })} />);
    expect(screen.getByText("No menu categories")).toBeTruthy();
  });

  it("filters, expands, edits and exercises item action controls", () => {
    const setItemSearch = vi.fn();
    const setFoodTypeFilter = vi.fn();
    const setStatusFilter = vi.fn();
    const setPublishFilter = vi.fn();
    const setItemForm = vi.fn();
    const publish = vi.fn();
    const remove = vi.fn();
    const duplicate = vi.fn((_: string, opts?: { onSuccess?: (item: MenuItem) => void }) =>
      opts?.onSuccess?.({ ...baseItem, id: "copy-1" } as MenuItem),
    );
    const toggle = vi.fn();
    const itemWithVariant = {
      ...baseItem,
      variants: [{ id: "v1", price: "120" }, { id: "v2", price: "150" }],
      tagLinks: [{ tagId: "t1", tag: { name: "Hot", color: null } }],
    } as unknown as MenuItem;
    render(<MenuItemsContent {...makeProps({
      itemSearch: "tea",
      foodTypeFilter: "VEG",
      statusFilter: "ACTIVE",
      publishFilter: "DRAFT",
      categories: [{ id: "cat-1", name: "Drinks", menuItems: [itemWithVariant] }] as never,
      setItemSearch,
      setFoodTypeFilter,
      setStatusFilter,
      setPublishFilter,
      setItemForm,
      publishMutation: { mutate: publish },
      deleteItemMutation: { mutate: remove },
      duplicateItemMutation: { mutate: duplicate },
      toggleAvailMutation: { mutate: toggle },
    })} />);

    expect(screen.getByText("₹120.00 – ₹150.00")).toBeTruthy();
    expect(screen.getByText("Hot")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search menu items"), { target: { value: "latte" } });
    fireEvent.change(screen.getByLabelText("Food type"), { target: { value: "NON_VEG" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "HIDDEN" } });
    fireEvent.change(screen.getByLabelText("Publication"), { target: { value: "PUBLISHED" } });
    expect(setItemSearch).toHaveBeenCalledWith("latte");
    expect(setFoodTypeFilter).toHaveBeenCalledWith("NON_VEG");
    expect(setStatusFilter).toHaveBeenCalledWith("HIDDEN");
    expect(setPublishFilter).toHaveBeenCalledWith("PUBLISHED");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(setItemSearch).toHaveBeenCalledWith("");
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(setItemForm).toHaveBeenCalledWith({ categoryId: "cat-1", item: null });
    fireEvent.click(screen.getByRole("button", { name: "Edit Masala Tea" }));
    expect(setItemForm).toHaveBeenCalledWith({ categoryId: "cat-1", item: itemWithVariant });
    fireEvent.click(screen.getByLabelText("Publish (make live)"));
    expect(publish).toHaveBeenCalledWith({ id: "item-1", publish: true });
    fireEvent.click(screen.getByLabelText("Duplicate item"));
    expect(setItemForm).toHaveBeenLastCalledWith({ categoryId: "cat-1", item: expect.objectContaining({ id: "copy-1" }) });
    fireEvent.click(screen.getByLabelText("Delete item"));
    expect(remove).toHaveBeenCalledWith("item-1");
    fireEvent.click(screen.getByLabelText("Manually mark out of stock"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Mark out of stock" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Manual override reason"), { target: { value: "Sold out" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark out of stock" }));
    expect(toggle).toHaveBeenCalledWith({ id: "item-1", isAvailable: false, reason: "Sold out" });
  });

  it("covers selection mode, existing override clearing and infinite scrolling", () => {
    const selectedSetter = vi.fn();
    const toggle = vi.fn();
    const items = Array.from({ length: 20 }, (_, index) => ({
      ...baseItem,
      id: `item-${index + 1}`,
      name: `Tea ${index + 1}`,
      isPublished: true,
      manualOverrideStatus: index === 0 ? "MANUAL" : null,
      manualOverrideReason: index === 0 ? "86d" : null,
      variants: [{ id: `v-${index}`, price: "100" }],
    })) as unknown as MenuItem[];
    const { rerender } = render(<MenuItemsContent {...makeProps({
      categories: [{ id: "cat-1", name: "Drinks", menuItems: items }] as never,
      toggleAvailMutation: { mutate: toggle },
    })} />);
    expect(screen.getByText(/Showing 18 of 20 items/)).toBeTruthy();
    act(() => {
      mocks.observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    expect(screen.queryByText(/Showing 18 of 20 items/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Clear manual availability override"));
    expect(toggle).toHaveBeenCalledWith({ id: "item-1", isAvailable: true });

    rerender(<MenuItemsContent {...makeProps({
      selectMode: true,
      selectedIds: ["item-1"],
      categories: [{ id: "cat-1", name: "Drinks", menuItems: items }] as never,
      setSelectedIds: selectedSetter,
    })} />);
    expect(screen.getByText("Bulk 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear bulk" }));
    expect(selectedSetter).toHaveBeenCalledWith([]);
    fireEvent.click(screen.getByRole("button", { name: "Tea 1, selected" }));
    expect(selectedSetter).toHaveBeenCalledWith(expect.any(Function));
    const updater = selectedSetter.mock.calls.at(-1)?.[0] as (current: string[]) => string[];
    expect(updater(["item-1", "item-2"])).toEqual(["item-2"]);
    fireEvent.keyDown(screen.getByRole("button", { name: "Tea 2" }), { key: "Enter" });
    const addUpdater = selectedSetter.mock.calls.at(-1)?.[0] as (current: string[]) => string[];
    expect(addUpdater(["item-1"])).toEqual(["item-1", "item-2"]);
  });
});
