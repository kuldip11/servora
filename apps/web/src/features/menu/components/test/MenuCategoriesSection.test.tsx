import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  categories: [] as any[],
  loading: false,
  add: vi.fn(),
  rename: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/features/menu/hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({ data: h.categories, isLoading: h.loading }),
}));
vi.mock("@/features/menu/hooks/useAddCategory", () => ({
  useAddCategory: () => ({ isPending: false, mutate: h.add }),
}));
vi.mock("@/features/menu/hooks/useRenameCategory", () => ({
  useRenameCategory: () => ({ isPending: false, mutate: h.rename }),
}));
vi.mock("@/features/menu/hooks/useDeleteCategory", () => ({
  useDeleteCategory: () => ({ mutate: h.del }),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: any) => <div>{children}</div>,
  EmptyState: ({ title, description, action }: any) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
      {action}
    </div>
  ),
  IconButton: ({ icon: _icon, ...props }: any) => <button {...props} />,
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
    </label>
  ),
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Spinner: () => <span>spinner</span>,
}));

import { MenuCategoriesSection } from "../MenuCategoriesSection";

describe("MenuCategoriesSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.categories = [];
    h.loading = false;
    h.add.mockImplementation((_value: any, options: any) =>
      options?.onSuccess?.(),
    );
    h.rename.mockImplementation((_value: any, options: any) =>
      options?.onSuccess?.(),
    );
  });

  it("renders loading/empty states and supports add, edit, delete and template actions", async () => {
    h.loading = true;
    const saveTemplate = vi.fn();
    const { rerender } = render(
      <MenuCategoriesSection onSaveTemplate={saveTemplate} />,
    );
    expect(screen.getByText("spinner")).toBeTruthy();

    h.loading = false;
    rerender(<MenuCategoriesSection onSaveTemplate={saveTemplate} />);
    expect(screen.getByText("No categories")).toBeTruthy();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add Category" })[0]!,
    );
    fireEvent.change(screen.getByLabelText("Category name"), {
      target: { value: " Starters " },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add Category" }).at(-1)!,
    );
    await waitFor(() =>
      expect(h.add).toHaveBeenCalledWith("Starters", expect.anything()),
    );

    h.categories = [{ id: "c1", name: "Mains", menuItems: [{ id: "i1" }] }];
    rerender(<MenuCategoriesSection onSaveTemplate={saveTemplate} />);
    expect(screen.getByText("1 items")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save as Template" }));
    expect(saveTemplate).toHaveBeenCalledWith({ id: "c1", name: "Mains" });

    fireEvent.click(screen.getByLabelText("Rename Mains"));
    fireEvent.change(screen.getByLabelText("Category name"), {
      target: { value: " Entrees " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(h.rename).toHaveBeenCalledWith(
        { id: "c1", name: "Entrees" },
        expect.anything(),
      ),
    );

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByLabelText("Delete Mains"));
    expect(h.del).toHaveBeenCalledWith("c1");
  });
});
