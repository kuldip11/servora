import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, QueryErrorState, StaleDataBanner } from "@pos/ui";
import { MenuPicker } from "./create-order/MenuPicker";
import { OrderCart } from "./create-order/OrderCart";
import { useTables } from "@/features/tables/hooks/useTables";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { useCreateOrder } from "@/features/orders/hooks/useCreateOrder";
import { toCartItemPayload } from "@/features/orders/services/orders.service";
import { ItemCustomizerModal } from "./ItemCustomizerModal";
import { cartItemKey, type CartItem } from "@/features/orders/utils/cartTypes";
import { scopeCategoriesForOrder } from "@/features/orders/utils/orderable-menu";
import type { FoodType, MenuCategory, MenuItem } from "@pos/types";
import { createOrderSchema } from "@pos/validation";
import { useBranches } from "@/features/branches/hooks/useBranches";
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
    const parsed = createOrderSchema.safeParse({
      type: orderType,
      ...(orderType === "DINE_IN" && tableId && { tableId }),
      ...(notes && { notes }),
      items: items.map(toCartItemPayload),
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Please review the order.",
      );
      return;
    }
    setValidationError("");

    const payload = {
      type: parsed.data.type,
      ...(parsed.data.tableId !== undefined && {
        tableId: parsed.data.tableId,
      }),
      ...(parsed.data.customerId !== undefined && {
        customerId: parsed.data.customerId,
      }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      items: (parsed.data.items ?? []).map((item) => ({
        ...item,
        ...(item.variantId !== undefined && { variantId: item.variantId }),
        ...(item.chefNotes !== undefined && { chefNotes: item.chefNotes }),
        ...(item.seatLabel && { seatLabel: item.seatLabel }),
        selectedOptions: (item.selectedOptions ?? []).map((option) => ({
          optionId: option.optionId,
          quantity: option.quantity ?? 1,
        })),
      })),
    };
    createMutation.mutate(payload, { onSuccess: onClose });
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
      {requiredDependencyFailed ? (
        <QueryErrorState
          title="Unable to load order-entry data"
          description="Branch capabilities, menu data, or required table data could not be loaded. Retry before creating an order."
          onRetry={retryDependencies}
          isRetrying={
            branchesQuery.isFetching ||
            categoriesQuery.isFetching ||
            activeMenusQuery.isFetching ||
            tablesQuery.isFetching
          }
        />
      ) : null}
      {requiredDependencyStale ? (
        <StaleDataBanner
          message="Some order-entry data could not be refreshed. Showing cached data; verify availability before submitting."
          onRetry={retryDependencies}
          isRetrying={
            branchesQuery.isFetching ||
            categoriesQuery.isFetching ||
            activeMenusQuery.isFetching ||
            tablesQuery.isFetching
          }
        />
      ) : null}
      {!requiredDependencyFailed && courseSequencingAvailable && (
        <label className="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={courseMode}
            onChange={(event) => {
              const enabled = event.target.checked;
              setCourseMode(enabled);
              setItems((current) =>
                current.map((item) =>
                  enabled
                    ? { ...item, courseNumber: item.courseNumber ?? 1 }
                    : (({ courseNumber: _courseNumber, ...rest }) => rest)(
                        item,
                      ),
                ),
              );
            }}
          />
          <span>
            <strong className="text-text-primary">Course mode</strong> — assign
            lines to courses; later courses are held until fired.
          </span>
        </label>
      )}
      {!requiredDependencyFailed && (
        <div className="grid min-h-0 grid-cols-1 gap-5 lg:h-full lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="min-h-0 space-y-3 lg:overflow-hidden">
            {activeMenus.length > 1 && (
              <label className="block text-sm font-medium">
                Menu
                <select
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
                  value={selectedMenuId}
                  onChange={(event) => setSelectedMenuId(event.target.value)}
                >
                  {activeMenus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </label>
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
