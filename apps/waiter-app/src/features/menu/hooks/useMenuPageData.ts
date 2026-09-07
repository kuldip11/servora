import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAuthApi,
  createCustomersApi,
  createMenuApi,
} from "@pos/api-client";
import type { OrderableMenuItem, Tenant } from "@pos/types";

import type { WaiterCombo, WaiterComboMenuItem } from "@/features/menu/combo";
import { ALL_ORDER_TYPES } from "@/features/menu/constants";
import { useCustomerSearch } from "@/features/menu/hooks/useCustomerSearch";
import type { WaiterOrderType } from "@/features/menu/hooks/useOrderDraft";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { useMyBranch } from "@/features/menu/hooks/useMyBranch";
import { useTables } from "@/features/menu/hooks/useTables";
import type { WaiterMenuCategory } from "@/features/menu/api/menu";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { apiClient } from "@/shared/lib/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";

type ActiveMenu = {
  id: string;
  name: string;
  memberships: Array<{ menuItemId: string }>;
};

type Params = {
  isAddingToExisting: boolean;
  orderType: WaiterOrderType;
  selectedMenuId: string;
  activeCategory: string | null;
  menuSearch: string;
  foodTypeFilter: string;
  customerSearch: string;
  onMenuChange: (menuId: string) => void;
  onOrderTypeChange: (orderType: WaiterOrderType) => void;
  onCategoryChange: (categoryId: string | null) => void;
};

const menuApi = createMenuApi(apiClient);
const customersApi = createCustomersApi(apiClient);
const authApi = createAuthApi(apiClient);

export const useMenuPageData = ({
  isAddingToExisting,
  orderType,
  selectedMenuId,
  activeCategory,
  menuSearch,
  foodTypeFilter,
  customerSearch,
  onMenuChange,
  onOrderTypeChange,
  onCategoryChange,
}: Params) => {
  const queryClient = useQueryClient();
  const { data: categories, isLoading: menuLoading } = useMenuCategories();
  const { data: activeMenus = [], isLoading: activeMenusLoading } = useQuery<
    ActiveMenu[]
  >({
    queryKey: ["menus", "active", orderType],
    queryFn: () => menuApi.listActiveMenus<ActiveMenu>(orderType),
  });

  useEffect(() => {
    if (!activeMenus.some((menu) => menu.id === selectedMenuId)) {
      onMenuChange(activeMenus[0]?.id ?? "");
    }
  }, [activeMenus, onMenuChange, selectedMenuId]);

  const scopedCategories = useMemo(() => {
    if (activeMenusLoading) return categories;
    const visibleIds = new Set(
      activeMenus
        .filter((menu) => !selectedMenuId || menu.id === selectedMenuId)
        .flatMap((menu) =>
          menu.memberships.map((membership) => membership.menuItemId),
        ),
    );
    return categories
      ?.map((category) => ({
        ...category,
        menuItems: (category.menuItems ?? []).filter((item) =>
          visibleIds.has(item.id),
        ),
      }))
      .filter((category) => category.menuItems.length > 0);
  }, [activeMenus, activeMenusLoading, categories, selectedMenuId]);

  const tenantId = localStorage.getItem(STORAGE_KEYS.tenant);
  const { data: tenantSettings } = useQuery<Tenant | null>({
    queryKey: ["tenant-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const memberships = await authApi.listTenants();
      return (
        memberships.find((entry) => entry.tenant.id === tenantId)?.tenant ??
        null
      );
    },
  });

  const { data: combos = [] } = useQuery<WaiterCombo[]>({
    queryKey: ["menu-combos"],
    queryFn: () => menuApi.listCombos<WaiterCombo>(),
    enabled: !isAddingToExisting,
  });
  const { data: promotions = [] } = useQuery<
    Array<{
      id: string;
      name: string;
      couponCode: string | null;
      isActive: boolean;
    }>
  >({
    queryKey: ["menu-promotions"],
    queryFn: () =>
      menuApi.listPromotions<{
        id: string;
        name: string;
        couponCode: string | null;
        isActive: boolean;
      }>(),
  });
  const { data: customerGroups = [] } = useQuery<
    Array<{ id: string; name: string }>
  >({
    queryKey: ["customer-groups"],
    queryFn: () => customersApi.listGroups(),
    enabled: !isAddingToExisting,
  });
  const { data: priceRules = [] } = useQuery<
    Array<{
      id: string;
      isPerCover?: boolean;
      coverTier?: "ADULT" | "CHILD" | null;
      price: string | number | null;
    }>
  >({
    queryKey: ["menu-price-rules", "per-cover"],
    queryFn: () =>
      menuApi.listPriceRules<{
        id: string;
        isPerCover?: boolean;
        coverTier?: "ADULT" | "CHILD" | null;
        price: string | number | null;
      }>(),
    enabled: !isAddingToExisting,
  });

  const menuById = useMemo(
    () =>
      new Map<string, WaiterComboMenuItem>(
        (
          scopedCategories?.flatMap(
            (category: { menuItems?: WaiterComboMenuItem[] }) =>
              category.menuItems ?? [],
          ) ?? []
        ).map((item) => [item.id, item]),
      ),
    [scopedCategories],
  );

  const { data: myBranch } = useMyBranch();
  const availableOrderTypes = myBranch
    ? ALL_ORDER_TYPES.filter((type) => myBranch[type.capabilityKey])
    : ALL_ORDER_TYPES;
  const tablesEnabled = myBranch ? myBranch.tablesEnabled : true;

  useEffect(() => {
    if (!availableOrderTypes.length) return;
    if (!availableOrderTypes.some((type) => type.value === orderType)) {
      onOrderTypeChange(availableOrderTypes[0]!.value);
    }
  }, [availableOrderTypes, onOrderTypeChange, orderType]);

  const { data: tables } = useTables(orderType === "DINE_IN" && tablesEnabled);
  const { data: customerResults } = useCustomerSearch(customerSearch);

  useRealtimeEvent("table.updated", () => {
    queryClient.invalidateQueries({ queryKey: ["tables"] });
  });
  useRealtimeEvent("menu.availability.updated", () => {
    queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
    queryClient.invalidateQueries({ queryKey: ["menus", "active"] });
    queryClient.invalidateQueries({ queryKey: ["menu-combos"] });
  });

  useEffect(() => {
    if (scopedCategories?.length && !activeCategory) {
      onCategoryChange(scopedCategories[0]?.id ?? null);
    }
  }, [activeCategory, onCategoryChange, scopedCategories]);

  const allItems =
    scopedCategories?.flatMap(
      (category: WaiterMenuCategory) => category.menuItems ?? [],
    ) ?? [];
  const resolvedActiveCategory =
    activeCategory ?? scopedCategories?.[0]?.id ?? null;
  const activeItems: OrderableMenuItem[] = (
    menuSearch.length >= 2
      ? allItems.filter((item) =>
          item.name.toLowerCase().includes(menuSearch.toLowerCase()),
        )
      : (scopedCategories?.find(
          (category) => category.id === resolvedActiveCategory,
        )?.menuItems ?? [])
  ).filter(
    (item) => foodTypeFilter === "ALL" || item.foodType === foodTypeFilter,
  );

  return {
    activeMenus,
    scopedCategories,
    menuLoading,
    courseSequencingAvailable: tenantSettings?.courseSequencingEnabled === true,
    activeCombos: combos.filter((combo) => combo.status === "ACTIVE"),
    promotions,
    customerGroups,
    perCoverRules: priceRules.filter((rule) => rule.isPerCover),
    menuById,
    availableOrderTypes,
    tablesEnabled,
    tables,
    customerResults,
    allItems,
    resolvedActiveCategory,
    activeItems,
  };
};
