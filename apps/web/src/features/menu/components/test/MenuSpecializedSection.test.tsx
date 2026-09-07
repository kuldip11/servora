import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ categories: [] as any[], loading: false }));

vi.mock("@/features/menu/hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({ data: h.categories, isLoading: h.loading }),
}));
vi.mock("../SubRecipeManager", () => ({
  SubRecipeManager: () => <div>Sub recipe manager</div>,
}));
vi.mock("../ItemFormModal", () => ({
  ItemFormModal: ({ item, onClose }: any) => (
    <div role="dialog">
      <span>Editing {item.name}</span>
      <button onClick={onClose}>Close editor</button>
    </div>
  ),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  Grid: ({ children }: any) => <div>{children}</div>,
  SearchInput: ({ onClear, ...props }: any) => (
    <div>
      <input {...props} />
      <button onClick={onClear}>Clear search</button>
    </div>
  ),
  Spinner: () => <span>spinner</span>,
}));

import { MenuSpecializedSection } from "../MenuSpecializedSection";

describe("MenuSpecializedSection", () => {
  beforeEach(() => {
    h.categories = [];
    h.loading = false;
  });

  it("supports recipe and availability search/editor states", () => {
    h.categories = [
      {
        id: "c1",
        name: "Mains",
        menuItems: [
          { id: "i1", name: "Latte" },
          { id: "i2", name: "Tea" },
        ],
      },
    ];
    const { rerender } = render(<MenuSpecializedSection mode="recipes" />);
    expect(screen.getByText("Sub recipe manager")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search items for recipes"), {
      target: { value: "lat" },
    });
    expect(screen.getByText("Latte")).toBeTruthy();
    expect(screen.queryByText("Tea")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Manage Recipe" }));
    expect(screen.getByText("Editing Latte")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Tea")).toBeTruthy();

    rerender(<MenuSpecializedSection mode="availability" />);
    expect(screen.queryByText("Sub recipe manager")).toBeNull();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Manage Availability" })[0]!,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("renders loading and no-match states", () => {
    h.loading = true;
    const { rerender } = render(<MenuSpecializedSection mode="availability" />);
    expect(screen.getByText("spinner")).toBeTruthy();
    h.loading = false;
    h.categories = [];
    rerender(<MenuSpecializedSection mode="availability" />);
    expect(screen.getByText("No matching menu items.")).toBeTruthy();
  });
});
