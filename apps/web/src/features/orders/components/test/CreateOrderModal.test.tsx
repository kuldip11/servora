import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  branches: [] as Array<Record<string, unknown>>,
  tables: [] as Array<Record<string, unknown>>,
  categories: [] as Array<Record<string, unknown>>,
  activeMenus: [] as Array<Record<string, unknown>>,
  createMutate: vi.fn(),
  courseAvailable: false,
  validationFails: false,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.activeMenus }),
}));
vi.mock("@pos/api-client", () => ({ createMenuApi: () => ({ listActiveMenus: vi.fn() }) }));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/features/branches/hooks/useBranches", () => ({ useBranches: () => ({ data: mocks.branches }) }));
vi.mock("@/features/tables/hooks/useTables", () => ({ useTables: () => ({ data: mocks.tables }) }));
vi.mock("@/features/menu/hooks/useMenuCategories", () => ({ useMenuCategories: () => ({ data: mocks.categories }) }));
vi.mock("@/features/orders/hooks/useCreateOrder", () => ({ useCreateOrder: () => ({ mutate: mocks.createMutate, isPending: false }) }));
vi.mock("@/features/orders/hooks/useCourseSequencingEnabled", () => ({ useCourseSequencingEnabled: () => mocks.courseAvailable }));
vi.mock("@/features/orders/services/orders.service", () => ({ toCartItemPayload: (item: unknown) => item }));
vi.mock("@/features/orders/utils/cartTypes", () => ({ cartItemKey: (item: { menuItemId: string }) => item.menuItemId }));
vi.mock("@/features/orders/utils/orderable-menu", () => ({ scopeCategoriesForOrder: (categories: unknown) => categories }));
vi.mock("@pos/validation", () => ({
  createOrderSchema: {
    safeParse: (value: any) => mocks.validationFails
      ? { success: false, error: { issues: [{ message: "Invalid order" }] } }
      : { success: true, data: value },
  },
}));
vi.mock("@pos/ui", () => ({
  Modal: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/features/orders/components/create-order/MenuPicker", () => ({
  MenuPicker: (props: any) => (
    <div>
      <div data-testid="picker-type">{props.orderType}</div>
      <div data-testid="picker-empty">{props.emptyMessage}</div>
      <div data-testid="picker-tables">{String(props.tablesEnabled)}</div>
      <button onClick={() => props.onOrderTypeChange("TAKEAWAY")}>type-takeaway</button>
      <button onClick={() => props.onTableChange("table-1")}>choose-table</button>
      <button onClick={() => props.onFilterChange("VEG")}>filter-veg</button>
      {(props.categories ?? []).flatMap((category: any) => category.menuItems ?? []).map((item: any) => (
        <button key={item.id} onClick={() => props.onItemClick(item)}>pick-{item.name}</button>
      ))}
    </div>
  ),
}));

vi.mock("@/features/orders/components/create-order/OrderCart", () => ({
  OrderCart: (props: any) => (
    <div>
      <div data-testid="cart-count">{props.items.length}</div>
      <div data-testid="cart-total">{props.total}</div>
      <div data-testid="cart-submit">{String(props.canSubmit)}</div>
      <div data-testid="cart-error">{props.validationError}</div>
      {props.items.map((item: any) => {
        const key = `${item.menuItemId}-${item.quantity}-${item.courseNumber ?? "x"}`;
        return <div key={key}>
          <span>{item.menuItemName}:{item.quantity}:{item.courseNumber ?? "none"}</span>
          <button onClick={() => props.onQty(item.menuItemId, 1)}>qty-up</button>
          <button onClick={() => props.onQty(item.menuItemId, -1)}>qty-down</button>
          <button onClick={() => props.onEdit(item)}>edit-item</button>
          <button onClick={() => props.onCourse(item.menuItemId, 3)}>course-3</button>
        </div>;
      })}
      <button onClick={() => props.onNotes("Kitchen note")}>set-notes</button>
      <button onClick={props.onSubmit}>submit-order</button>
    </div>
  ),
}));

vi.mock("@/features/orders/components/ItemCustomizerModal", () => ({
  ItemCustomizerModal: ({ item, existingCartItem, courseMode, onConfirm, onClose }: any) => (
    <div data-testid="customizer">
      <span>{existingCartItem ? "editing" : "new"}:{String(courseMode)}</span>
      <button onClick={() => onConfirm({
        menuItemId: item.id,
        menuItemName: item.name,
        basePrice: Number(item.basePrice),
        modifiers: [{ modifierId: "mod-1", name: "Cheese", quantity: 1 }],
        chefNotes: "hot",
        seatLabel: "A",
        quantity: existingCartItem ? 4 : 1,
        unitPrice: Number(item.basePrice) + 10,
        selectedOptions: [{ optionId: "opt-1" }],
        ...(courseMode ? { courseNumber: 2 } : {}),
      })}>confirm-custom</button>
      <button onClick={onClose}>close-custom</button>
    </div>
  ),
}));

import { CreateOrderModal } from "../CreateOrderModal";

const plainItem = { id: "plain", name: "Plain", basePrice: 100, variants: [], modifierGroupLinks: [] };
const optionItem = { id: "option", name: "Option", basePrice: 200, variants: [{ id: "v1" }], modifierGroupLinks: [] };
const modifierItem = { id: "modifier", name: "Modifier", basePrice: 150, variants: [], modifierGroupLinks: [{ id: "l1" }] };
const categories = [{ id: "c1", menuItems: [plainItem, optionItem, modifierItem] }];

const baseBranch = {
  id: "branch-1",
  dineInEnabled: true,
  takeawayEnabled: true,
  deliveryEnabled: true,
  onlineEnabled: true,
  tablesEnabled: true,
};

describe("CreateOrderModal coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.branches = [baseBranch];
    mocks.tables = [{ id: "table-1" }];
    mocks.categories = categories;
    mocks.activeMenus = [{ id: "m1", name: "Menu 1", memberships: [] }];
    mocks.courseAvailable = false;
    mocks.validationFails = false;
  });

  it("covers duplicate items, quantity changes, notes, table selection, validation and submit", () => {
    const onClose = vi.fn();
    render(<CreateOrderModal onClose={onClose} />);
    fireEvent.click(screen.getByText("pick-Plain"));
    fireEvent.click(screen.getByText("pick-Plain"));
    expect(screen.getByText("Plain:2:none")).toBeTruthy();
    expect(screen.getByTestId("cart-submit").textContent).toBe("false");
    fireEvent.click(screen.getByText("choose-table"));
    expect(screen.getByTestId("cart-submit").textContent).toBe("true");
    fireEvent.click(screen.getByText("set-notes"));

    mocks.validationFails = true;
    fireEvent.click(screen.getByText("submit-order"));
    expect(screen.getByTestId("cart-error").textContent).toBe("Invalid order");

    mocks.validationFails = false;
    fireEvent.click(screen.getByText("qty-up"));
    expect(screen.getByText("Plain:3:none")).toBeTruthy();
    fireEvent.click(screen.getByText("qty-down"));
    fireEvent.click(screen.getByText("submit-order"));
    expect(mocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "DINE_IN", tableId: "table-1", notes: "Kitchen note", items: [expect.objectContaining({ quantity: 2 })] }),
      expect.objectContaining({ onSuccess: onClose }),
    );
  });

  it("covers option customizer add/edit/replace and close", () => {
    render(<CreateOrderModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-Option"));
    expect(screen.getByText("new:false")).toBeTruthy();
    fireEvent.click(screen.getByText("close-custom"));
    fireEvent.click(screen.getByText("pick-Modifier"));
    fireEvent.click(screen.getByText("confirm-custom"));
    expect(screen.getByText("Modifier:1:none")).toBeTruthy();
    fireEvent.click(screen.getByText("edit-item"));
    expect(screen.getByText("editing:false")).toBeTruthy();
    fireEvent.click(screen.getByText("confirm-custom"));
    expect(screen.getByText("Modifier:4:none")).toBeTruthy();
  });

  it("covers course-mode enabling, course updates, disabling, and item removal", () => {
    mocks.courseAvailable = true;
    render(<CreateOrderModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("pick-Plain"));
    const courseToggle = screen.getByRole("checkbox");
    fireEvent.click(courseToggle);
    expect(screen.getByText("Plain:1:1")).toBeTruthy();
    fireEvent.click(screen.getByText("course-3"));
    expect(screen.getByText("Plain:1:3")).toBeTruthy();
    fireEvent.click(courseToggle);
    expect(screen.getByText("Plain:1:none")).toBeTruthy();
    fireEvent.click(screen.getByText("qty-down"));
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });

  it("covers order-type fallback, tables-disabled branch and empty active menu messaging", () => {
    mocks.branches = [{ ...baseBranch, dineInEnabled: false, deliveryEnabled: false, onlineEnabled: false, tablesEnabled: false }];
    mocks.activeMenus = [];
    render(<CreateOrderModal onClose={vi.fn()} />);
    expect(screen.getByTestId("picker-type").textContent).toBe("TAKEAWAY");
    expect(screen.getByTestId("picker-tables").textContent).toBe("false");
    expect(screen.getByTestId("picker-empty").textContent).toMatch(/No active menu/);
    fireEvent.click(screen.getByText("pick-Plain"));
    expect(screen.getByTestId("cart-submit").textContent).toBe("true");
  });

  it("covers multi-menu selection and unscoped branch defaults", () => {
    mocks.branches = [];
    mocks.activeMenus = [
      { id: "m1", name: "Menu 1", memberships: [] },
      { id: "m2", name: "Menu 2", memberships: [] },
    ];
    render(<CreateOrderModal onClose={vi.fn()} />);
    const menu = screen.getByDisplayValue("Menu 1");
    fireEvent.change(menu, { target: { value: "m2" } });
    fireEvent.click(screen.getByText("filter-veg"));
    fireEvent.click(screen.getByText("type-takeaway"));
    expect(screen.getByTestId("picker-type").textContent).toBe("TAKEAWAY");
    expect(screen.getByTestId("picker-tables").textContent).toBe("true");
  });
});
