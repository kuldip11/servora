import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  addMutate: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  realtime: [] as Array<() => void>,
  createValid: true,
  addValid: true,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ queryKey }: any) => {
    const key = JSON.stringify(queryKey);
    if (key.includes('"menus","active"'))
      return {
        data: [
          {
            id: "menu1",
            name: "Lunch",
            memberships: [{ menuItemId: "m1" }, { menuItemId: "m2" }],
          },
          { id: "menu2", name: "Dinner", memberships: [{ menuItemId: "m1" }] },
        ],
        isLoading: false,
      };
    if (key.includes("tenant-settings"))
      return { data: { courseSequencingEnabled: true } };
    if (key.includes("menu-combos"))
      return {
        data: [
          {
            id: "combo1",
            name: "Meal Deal",
            status: "ACTIVE",
            pricePolicy: "FIXED",
            fixedPrice: 200,
            slots: [
              {
                id: "slot1",
                minSelections: 1,
                maxSelections: 1,
                options: [{ menuItemId: "m1" }],
              },
            ],
          },
        ],
      };
    if (key.includes("menu-promotions"))
      return {
        data: [{ id: "p1", name: "Promo", couponCode: null, isActive: true }],
      };
    if (key.includes("customer-groups"))
      return { data: [{ id: "g1", name: "VIP" }] };
    if (key.includes("menu-price-rules"))
      return {
        data: [{ id: "r1", isPerCover: true, coverTier: "ADULT", price: 50 }],
      };
    return { data: null };
  },
}));

vi.mock("@pos/validation", () => ({
  createOrderSchema: {
    safeParse: (value: any) =>
      mocks.createValid
        ? { success: true, data: { ...value, type: value.type } }
        : { success: false, error: {} },
  },
  addOrderItemsSchema: {
    safeParse: (value: any) =>
      mocks.addValid
        ? { success: true, data: value }
        : { success: false, error: {} },
  },
}));

vi.mock("@pos/ui", () => ({
  IconButton: ({ onClick, "aria-label": label }: any) => (
    <button aria-label={label} onClick={onClick} />
  ),
  SelectMenu: ({ label, onChange, options = [] }: any) => (
    <button
      onClick={() => onChange(options[1]?.value ?? options[0]?.value ?? "")}
    >
      {label ?? "select"}
    </button>
  ),
  toast: mocks.toast,
}));

vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (_event: string, callback: () => void) =>
    mocks.realtime.push(callback),
}));
vi.mock("@/features/orders/hooks/useCreateOrder", () => ({
  useCreateOrder: () => ({ isPending: false, mutate: mocks.createMutate }),
}));
vi.mock("@/features/orders/hooks/useAddOrderItems", () => ({
  useAddOrderItems: () => ({ isPending: false, mutate: mocks.addMutate }),
}));
vi.mock("@/features/menu/hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({
    isLoading: false,
    data: [
      {
        id: "c1",
        name: "Main",
        menuItems: [
          {
            id: "m1",
            name: "Burger",
            basePrice: 100,
            foodType: "VEG",
            variants: [],
            modifierGroupLinks: [],
          },
          {
            id: "m2",
            name: "Pizza",
            basePrice: 150,
            foodType: "NON_VEG",
            variants: [{ id: "v1", name: "L", price: 170 }],
            modifierGroupLinks: [],
          },
        ],
      },
    ],
  }),
}));
vi.mock("@/features/menu/hooks/useMyBranch", () => ({
  useMyBranch: () => ({
    data: {
      id: "b1",
      tablesEnabled: true,
      dineInEnabled: true,
      takeawayEnabled: true,
      deliveryEnabled: true,
    },
  }),
}));
vi.mock("@/features/menu/hooks/useTables", () => ({
  useTables: () => ({
    data: [{ id: "t1", name: "Table 1", status: "AVAILABLE" }],
  }),
}));
vi.mock("@/features/menu/hooks/useCustomerSearch", () => ({
  useCustomerSearch: () => ({ data: [{ id: "cust1", name: "Ada" }] }),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@pos/api-client", () => ({
  createMenuApi: () => ({}),
  createCustomersApi: () => ({}),
  createAuthApi: () => ({}),
}));

vi.mock("@/features/menu/components/SearchBar", () => ({
  SearchBar: ({ onChange }: any) => (
    <button onClick={() => onChange("bu")}>search</button>
  ),
}));
vi.mock("@/features/menu/components/CategoryTabs", () => ({
  CategoryTabs: ({ onFoodTypeChange, onCategoryChange }: any) => (
    <>
      <button onClick={() => onFoodTypeChange("VEG")}>veg</button>
      <button onClick={() => onCategoryChange("c1")}>category</button>
    </>
  ),
}));
vi.mock("@/features/menu/components/MenuGrid", () => ({
  MenuGrid: ({ items, onItemTap, onQtyChange }: any) => (
    <div>
      <button
        onClick={() =>
          onItemTap({
            id: "m1",
            name: "Burger",
            basePrice: 100,
            variants: [],
            modifierGroupLinks: [],
          })
        }
      >
        add-simple
      </button>
      <button
        onClick={() =>
          onItemTap({
            id: "m2",
            name: "Pizza",
            basePrice: 150,
            variants: [{ id: "v1", name: "L", price: 170 }],
            modifierGroupLinks: [],
          })
        }
      >
        add-custom
      </button>
      <button onClick={() => onQtyChange("m1||||", -1)}>grid-dec</button>
      <span>{items.length}</span>
    </div>
  ),
}));
vi.mock("@/features/menu/components/OrderOptionsPanel", () => ({
  OrderOptionsPanel: (props: any) => (
    <div>
      <button onClick={() => props.onOrderTypeChange("TAKEAWAY")}>
        takeaway
      </button>
      <button onClick={() => props.onTableChange("t1")}>table</button>
      <button onClick={() => props.onSelectCustomer("cust1", "Ada")}>
        customer
      </button>
      <button onClick={props.onClearCustomer}>clear-customer</button>
      <button onClick={() => props.onCustomerSearchChange("ad")}>
        customer-search
      </button>
      <button onClick={() => props.onCustomerGroupChange("g1")}>group</button>
      <button onClick={() => props.onBillingModeChange("PER_COVER")}>
        per-cover
      </button>
      <button onClick={() => props.onBillingModeChange("LINE_ITEMS")}>
        line-items
      </button>
      <button onClick={() => props.onCoverCountChange(2)}>covers</button>
      <button onClick={() => props.onPerCoverPriceRuleChange("r1")}>
        rate
      </button>
    </div>
  ),
}));
vi.mock("@/features/menu/components/TabletOrderRail", () => ({
  TabletOrderRail: (props: any) => (
    <div>
      <button onClick={props.onReview}>review</button>
      <button onClick={() => props.onEditItem("m1||||")}>edit-line</button>
      <button onClick={() => props.onUpdateQty("m1||||", 1)}>rail-inc</button>
      <button onClick={() => props.onUpdateComboQty("combo1|slot1:m1", -1)}>
        combo-dec
      </button>
      <span data-testid="total-items">{props.totalItems}</span>
    </div>
  ),
}));
vi.mock("@/features/menu/components/ItemCustomiser", () => ({
  ItemCustomiser: ({ item, onConfirm, onClose }: any) => (
    <div>
      <button
        onClick={() =>
          onConfirm({
            menuItemId: item.id,
            name: item.name,
            basePrice: Number(item.basePrice),
            variantId: "v1",
            variantName: "L",
            modifiers: [],
            chefNotes: "note",
            seatLabel: "A",
            weightQuantity: 2,
            manualPrice: 9,
            quantity: 1,
            unitPrice: 170,
          })
        }
      >
        confirm-custom
      </button>
      <button onClick={onClose}>close-custom</button>
    </div>
  ),
}));
vi.mock("@/features/menu/components/ComboCustomiser", () => ({
  ComboCustomiser: ({ onToggle, onConfirm, onClose }: any) => (
    <div>
      <button onClick={() => onToggle("slot1", "m1")}>toggle-combo</button>
      <button onClick={onConfirm}>confirm-combo</button>
      <button onClick={onClose}>close-combo</button>
    </div>
  ),
}));
vi.mock("@/features/menu/components/CartSummary", () => ({
  CartSummary: (props: any) => (
    <div>
      <button onClick={props.onSubmit}>submit-order</button>
      <button onClick={() => props.onCourseModeChange(true)}>course-on</button>
      <button onClick={() => props.onCourseModeChange(false)}>
        course-off
      </button>
      <button onClick={() => props.onRoundCourseNumberChange(2)}>
        round-course
      </button>
      <button onClick={() => props.onUpdateCourse("m1||||", 2)}>
        item-course
      </button>
      <button onClick={() => props.onUpdateComboCourse("combo1|slot1:m1", 2)}>
        combo-course
      </button>
      <button onClick={() => props.onOrderNotesChange("notes")}>notes</button>
      <button onClick={() => props.onCouponCodeChange("SAVE")}>coupon</button>
      <button onClick={() => props.onTogglePromotion("p1")}>promo</button>
      <button onClick={() => props.onUpdateQty("m1||||", -1)}>cart-dec</button>
      <button onClick={props.onClose}>close-cart</button>
    </div>
  ),
}));

import { MenuPage } from "@/features/menu/pages/MenuPage";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.realtime.length = 0;
  mocks.createValid = true;
  mocks.addValid = true;
  localStorage.clear();
  localStorage.setItem("pos_tenant_id", "tenant1");
});

describe("MenuPage interactions", () => {
  it("covers create-order cart, customisation, combo and option state transitions", () => {
    const placed = vi.fn();
    mocks.createMutate.mockImplementation((_input, options) =>
      options?.onSuccess?.({ id: "o-new" }),
    );
    render(<MenuPage onBack={vi.fn()} onOrderPlaced={placed} />);

    fireEvent.click(screen.getByText("takeaway"));
    fireEvent.click(screen.getByText("customer-search"));
    fireEvent.click(screen.getByText("customer"));
    fireEvent.click(screen.getByText("clear-customer"));
    fireEvent.click(screen.getByText("group"));
    fireEvent.click(screen.getByText("per-cover"));
    fireEvent.click(screen.getByText("covers"));
    fireEvent.click(screen.getByText("rate"));
    fireEvent.click(screen.getByText("line-items"));
    fireEvent.click(screen.getByText("search"));
    fireEvent.click(screen.getByText("veg"));
    fireEvent.click(screen.getByText("category"));

    fireEvent.click(screen.getByText("add-simple"));
    fireEvent.click(screen.getByText("add-simple"));
    fireEvent.click(screen.getByText("rail-inc"));
    fireEvent.click(screen.getByText("add-custom"));
    fireEvent.click(screen.getByText("confirm-custom"));

    fireEvent.click(screen.getByText("Meal Deal"));
    fireEvent.click(screen.getByText("toggle-combo"));
    fireEvent.click(screen.getByText("confirm-combo"));

    for (const callback of mocks.realtime) callback();
    expect(mocks.invalidateQueries).toHaveBeenCalled();

    fireEvent.click(screen.getByText("review"));
    fireEvent.click(screen.getByText("course-on"));
    fireEvent.click(screen.getByText("item-course"));
    fireEvent.click(screen.getByText("combo-course"));
    fireEvent.click(screen.getByText("notes"));
    fireEvent.click(screen.getByText("coupon"));
    fireEvent.click(screen.getByText("promo"));
    fireEvent.click(screen.getByText("submit-order"));

    expect(mocks.createMutate).toHaveBeenCalled();
    expect(placed).toHaveBeenCalledWith("o-new");
    expect(mocks.toast).toHaveBeenCalled();
  });

  it("covers existing-order submission and validation failures", () => {
    const placed = vi.fn();
    mocks.addMutate.mockImplementation((_input, options) =>
      options?.onSuccess?.(),
    );
    const { rerender } = render(
      <MenuPage onBack={vi.fn()} onOrderPlaced={placed} existingOrderId="o1" />,
    );
    fireEvent.click(screen.getByText("add-simple"));
    fireEvent.click(screen.getByText("review"));
    fireEvent.click(screen.getByText("course-on"));
    fireEvent.click(screen.getByText("round-course"));
    fireEvent.click(screen.getByText("notes"));
    fireEvent.click(screen.getByText("coupon"));
    fireEvent.click(screen.getByText("promo"));
    fireEvent.click(screen.getByText("submit-order"));
    expect(mocks.addMutate).toHaveBeenCalled();
    expect(placed).toHaveBeenCalledWith("o1");

    mocks.addValid = false;
    fireEvent.click(screen.getByText("submit-order"));
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "danger" }),
    );

    mocks.createValid = false;
    rerender(<MenuPage onBack={vi.fn()} onOrderPlaced={placed} />);
  });
});
