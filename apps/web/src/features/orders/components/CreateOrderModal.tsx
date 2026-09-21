import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Select } from "@pos/ui";
import { MenuPicker } from "./create-order/MenuPicker";
import { OrderCart } from "./create-order/OrderCart";
import { CourseModeToggle } from "./create-order/CourseModeToggle";
import { OrderDependencyFeedback } from "./create-order/OrderDependencyFeedback";
import { useTables } from "@/features/tables";
import { useMenuCategories } from "@/features/menu";
import { useCreateOrder } from "@/features/orders";
import { buildCreateOrderInput } from "@/features/orders/services/orders.service";
import { ItemCustomizerModal } from "./ItemCustomizerModal";
import { cartItemKey, type CartItem } from "@/features/orders/utils/cartTypes";
import { scopeCategoriesForOrder } from "@/features/orders/utils/orderable-menu";
import type { FoodType, MenuCategory, MenuItem } from "@pos/types";
import { createOrderSchema } from "@pos/validation";
import { useBranches } from "@/features/branches";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
import { useCourseSequencingEnabled } from "@/features/orders/hooks/useCourseSequencingEnabled";

interface ActiveMenuSummary {
  id: string;
  name: string;
  memberships: Array<{ menuItemId: string }>;
}

import { ALL_ORDER_TYPES } from "@/features/orders/constants";

export const CreateOrderModal = ({ onClose }: { onClose: () => void }) => {
  const [orderType, setOrderType] = useState("DINE_IN");
  const [tableId, setTableId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);
  const [foodTypeFilter, setFoodTypeFilter] = useState<FoodType | "ALL">("ALL");
  const [customising, setCustomising] = useState<{
    item: MenuItem;
    existing?: CartItem;
    originalKey?: string;
  } | null>(null);
  const [validationError, setValidationError] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [courseMode, setCourseMode] = useState(false);
  const courseSequencingAvailable = useCourseSequencingEnabled();

  const branchesQuery = useBranches();
  const branchesInScope = branchesQuery.data;

  const currentBranch =
    branchesInScope?.length === 1 ? branchesInScope[0] : undefined;

  const availableOrderTypes = currentBranch
    ? ALL_ORDER_TYPES.filter((t) => currentBranch[t.capabilityKey])
    : [];

  const tablesEnabled = currentBranch?.tablesEnabled === true;

  useEffect(() => {
    if (!availableOrderTypes.length) return;
    if (!availableOrderTypes.some((t) => t.value === orderType)) {
      setOrderType(availableOrderTypes[0]!.value);
      setTableId("");
    }
  }, [currentBranch?.id]);

  const categoriesQuery = useMenuCategories();
  const categories = categoriesQuery.data;
  const activeMenusQuery = useQuery<ActiveMenuSummary[]>({
    queryKey: ["menus", "active", orderType],
    queryFn: () => menuApi.listActiveMenus(orderType),
  });
  const activeMenus = activeMenusQuery.data ?? [];
  useEffect(() => {
    if (!activeMenus.some((menu) => menu.id === selectedMenuId))
      setSelectedMenuId(activeMenus[0]?.id ?? "");
  }, [activeMenus, selectedMenuId]);
  const scopedCategories = scopeCategoriesForOrder(
    categories as MenuCategory[] | undefined,
    activeMenus,
    selectedMenuId,
  );

  const tablesQuery = useTables({
    enabled: orderType === "DINE_IN" && tablesEnabled,
  });
  const tables = tablesQuery.data;

  const requiredDependencyFailed =
    (branchesQuery.isError && !branchesQuery.data) ||
    (categoriesQuery.isError && !categoriesQuery.data) ||
    (activeMenusQuery.isError && !activeMenusQuery.data) ||
    (orderType === "DINE_IN" &&
      tablesEnabled &&
      tablesQuery.isError &&
      !tablesQuery.data);
  const requiredDependencyStale =
    (branchesQuery.isError && Boolean(branchesQuery.data)) ||
    (categoriesQuery.isError && Boolean(categoriesQuery.data)) ||
    (activeMenusQuery.isError && Boolean(activeMenusQuery.data)) ||
    (orderType === "DINE_IN" &&
      tablesEnabled &&
      tablesQuery.isError &&
      Boolean(tablesQuery.data));
  const retryDependencies = () => {
    if (branchesQuery.isError) void branchesQuery.refetch();
    if (categoriesQuery.isError) void categoriesQuery.refetch();
    if (activeMenusQuery.isError) void activeMenusQuery.refetch();
    if (tablesQuery.isError) void tablesQuery.refetch();
  };

  const createMutation = useCreateOrder();

  function handleItemClick(menuItem: MenuItem) {
    const hasOptions =
      menuItem.variants?.length > 0 ||
      (menuItem.modifierGroupLinks?.length ?? 0) > 0;
    if (hasOptions) {
      setCustomising({ item: menuItem });
      return;
    }
    addOrIncrementItem({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      basePrice: Number(menuItem.basePrice),
      modifiers: [],
      chefNotes: "",
      seatLabel: "",
      quantity: 1,
      ...(courseMode ? { courseNumber: 1 } : {}),
      unitPrice: Number(menuItem.basePrice),
    });
  }

  function addOrIncrementItem(newItem: CartItem) {
    setItems((prev) => {
      const key = cartItemKey(newItem);
      const existing = prev.find((i) => cartItemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          cartItemKey(i) === key
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i,
        );
      }
      return [...prev, newItem];
    });
  }

  function editCartItem(item: CartItem) {
    const menuItem = scopedCategories
      ?.flatMap((category) => category.menuItems ?? [])
      .find((candidate) => candidate.id === item.menuItemId);
    if (!menuItem) return;
    setCustomising({
      item: menuItem,
      existing: item,
      originalKey: cartItemKey(item),
    });
  }

  function replaceCartItem(originalKey: string, updated: CartItem) {
    setItems((current) =>
      current.map((item) =>
        cartItemKey(item) === originalKey ? updated : item,
      ),
    );
  }

  function updateCourse(key: string, courseNumber: number) {
    setItems((prev) =>
      prev.map((item) =>
        cartItemKey(item) === key ? { ...item, courseNumber } : item,
      ),
    );
  }

  function updateQty(key: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) =>
          cartItemKey(i) === key ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  function handleSubmit() {
    const parsed = createOrderSchema.safeParse(
      buildCreateOrderInput({
        type: orderType,
        tableId: orderType === "DINE_IN" ? tableId : "",
        notes,
        items,
      }),
    );
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Please review the order.",
      );
      return;
    }
    setValidationError("");
    createMutation.mutate(parsed.data, { onSuccess: onClose });
  }

  return (
    <Modal
      open
      title="New Order"
      description="Create an order and review its items before submitting"
      onClose={onClose}
      size="full"
      bodyClassName="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden"
    >
      <OrderDependencyFeedback
        failed={requiredDependencyFailed}
        stale={requiredDependencyStale}
        retrying={
          branchesQuery.isFetching ||
          categoriesQuery.isFetching ||
          activeMenusQuery.isFetching ||
          tablesQuery.isFetching
        }
        onRetry={retryDependencies}
      />
      {!requiredDependencyFailed && courseSequencingAvailable && (
        <CourseModeToggle
          checked={courseMode}
          onChange={(enabled) => {
            setCourseMode(enabled);
            setItems((current) =>
              current.map((item) =>
                enabled
                  ? { ...item, courseNumber: item.courseNumber ?? 1 }
                  : (({ courseNumber: _courseNumber, ...rest }) => rest)(item),
              ),
            );
          }}
        />
      )}
      {!requiredDependencyFailed && (
        <div className="grid min-h-0 grid-cols-1 gap-5 lg:h-full lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-h-0 space-y-3 lg:overflow-hidden">
            {activeMenus.length > 1 && (
              <Select
                label="Menu"
                value={selectedMenuId}
                onChange={setSelectedMenuId}
                options={activeMenus.map((menu) => ({
                  value: menu.id,
                  label: menu.name,
                }))}
              />
            )}
            <MenuPicker
              orderType={orderType}
              tableId={tableId}
              tablesEnabled={tablesEnabled}
              tables={tables}
              categories={scopedCategories}
              filter={foodTypeFilter}
              availableOrderTypes={availableOrderTypes}
              onOrderTypeChange={(v) => {
                setOrderType(v);
                setTableId("");
              }}
              onTableChange={setTableId}
              onFilterChange={setFoodTypeFilter}
              onItemClick={handleItemClick}
              emptyMessage={
                activeMenus.length === 0
                  ? "No active menu is available for this branch and order type."
                  : "This menu has no published items available for this branch."
              }
            />
          </div>
          <OrderCart
            items={items}
            notes={notes}
            total={total}
            pending={createMutation.isPending}
            canSubmit={
              !!items.length &&
              !!availableOrderTypes.length &&
              !(orderType === "DINE_IN" && tablesEnabled && !tableId) &&
              !requiredDependencyStale
            }
            validationError={validationError}
            courseMode={courseMode}
            onQty={updateQty}
            onEdit={editCartItem}
            onCourse={updateCourse}
            onNotes={setNotes}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {!requiredDependencyFailed && customising && (
        <ItemCustomizerModal
          item={customising.item}
          {...(customising.existing
            ? { existingCartItem: customising.existing }
            : {})}
          courseMode={courseMode}
          onConfirm={(item) =>
            customising.originalKey
              ? replaceCartItem(customising.originalKey, item)
              : addOrIncrementItem(item)
          }
          onClose={() => setCustomising(null)}
        />
      )}
    </Modal>
  );
};
