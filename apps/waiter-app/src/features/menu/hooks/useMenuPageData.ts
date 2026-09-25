import { useCallback, useEffect, useMemo } from "react";
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
import { useMenuCategories } from "@/features/menu";
import { useMyBranch } from "@/features/menu/hooks/useMyBranch";
import { useTables } from "@/features/menu";
import type { WaiterMenuCategory } from "@/features/menu/api/menu";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { apiClient } from "@/shared/lib/api-client";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { menuKeys } from "@/features/menu/query/menu.keys";
import { getWaiterQueryScope } from "@/shared/lib/query-scope";

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
  const scope = getWaiterQueryScope();
  const categoriesQuery = useMenuCategories();
  const { data: categories, isLoading: menuLoading } = categoriesQuery;
  const activeMenusQuery = useQuery<ActiveMenu[]>({
    queryKey: menuKeys.activeMenus(scope, orderType),
    queryFn: ({ signal }) =>
      menuApi.listActiveMenus<ActiveMenu>(orderType, signal),
  });
  const activeMenus = activeMenusQuery.data ?? [];

  useEffect(() => {
    if (!activeMenusQuery.data) return;
    if (!activeMenus.some((menu) => menu.id === selectedMenuId)) {
      onMenuChange(activeMenus[0]?.id ?? "");
    }
  }, [activeMenus, activeMenusQuery.data, onMenuChange, selectedMenuId]);

  const scopedCategories = useMemo(() => {
    if (activeMenusQuery.isLoading) return categories;
    if (!activeMenusQuery.data) return undefined;
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
  }, [
    activeMenus,
    activeMenusQuery.data,
    activeMenusQuery.isLoading,
    categories,
    selectedMenuId,
  ]);

  const tenantId = localStorage.getItem(STORAGE_KEYS.tenant);
  const tenantSettingsQuery = useQuery<Tenant | null>({
    queryKey: menuKeys.tenantSettings(scope),
    enabled: !!tenantId,
    queryFn: async () => {
      const memberships = await authApi.listTenants();
      return (
        memberships.find((entry) => entry.tenant.id === tenantId)?.tenant ??
        null
      );
    },
  });

  const combosQuery = useQuery<WaiterCombo[]>({
    queryKey: menuKeys.combos(scope),
    queryFn: ({ signal }) => menuApi.listCombos<WaiterCombo>(signal),
    enabled: !isAddingToExisting,
  });
  const promotionsQuery = useQuery<
    Array<{
      id: string;
      name: string;
      couponCode: string | null;
      isActive: boolean;
    }>
  >({
    queryKey: menuKeys.promotions(scope),
    queryFn: ({ signal }) =>
      menuApi.listPromotions<{
        id: string;
        name: string;
        couponCode: string | null;
        isActive: boolean;
      }>(signal),
  });
  const customerGroupsQuery = useQuery<Array<{ id: string; name: string }>>({
    queryKey: menuKeys.customerGroups(scope),
    queryFn: ({ signal }) => customersApi.listGroups(signal),
    enabled: !isAddingToExisting,
  });
  const priceRulesQuery = useQuery<
    Array<{
      id: string;
      isPerCover?: boolean;
      coverTier?: "ADULT" | "CHILD" | null;
      price: string | number | null;
    }>
  >({
    queryKey: menuKeys.priceRules(scope),
    queryFn: ({ signal }) =>
      menuApi.listPriceRules<{
        id: string;
        isPerCover?: boolean;
        coverTier?: "ADULT" | "CHILD" | null;
        price: string | number | null;
      }>(signal),
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

  const branchQuery = useMyBranch();
  const myBranch = branchQuery.data;
  const availableOrderTypes = myBranch
    ? ALL_ORDER_TYPES.filter((type) => myBranch[type.capabilityKey])
    : [];
  const tablesEnabled = myBranch?.tablesEnabled === true;

  useEffect(() => {
    if (!availableOrderTypes.length) return;
    if (!availableOrderTypes.some((type) => type.value === orderType)) {
      onOrderTypeChange(availableOrderTypes[0]!.value);
    }
  }, [availableOrderTypes, onOrderTypeChange, orderType]);

  const tablesQuery = useTables(
    orderType === "DINE_IN" && tablesEnabled && branchQuery.isSuccess,
  );
  const customerSearchQuery = useCustomerSearch(customerSearch);

  useRealtimeEvent("table.updated", () => {
    queryClient.invalidateQueries({ queryKey: menuKeys.tables(scope) });
  });
  useRealtimeEvent("menu.availability.updated", () => {
    queryClient.invalidateQueries({ queryKey: menuKeys.categories(scope) });
    queryClient.invalidateQueries({
      queryKey: [...menuKeys.all(scope), "active"],
    });
    queryClient.invalidateQueries({ queryKey: menuKeys.combos(scope) });
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

  const tenantSettingsRequired = !!tenantId;
  const tablesRequired = orderType === "DINE_IN" && tablesEnabled;
  const criticalQueries = [categoriesQuery, activeMenusQuery, branchQuery];
  const requiredDependencyLoading =
    criticalQueries.some((query) => query.isLoading) ||
    (tenantSettingsRequired && tenantSettingsQuery.isLoading) ||
    (tablesRequired && tablesQuery.isLoading);
  const requiredDependencyFailed =
    criticalQueries.some(
      (query) => query.isError && query.data === undefined,
    ) ||
    (tenantSettingsRequired &&
      tenantSettingsQuery.isError &&
      tenantSettingsQuery.data === undefined) ||
    (tablesRequired && tablesQuery.isError && tablesQuery.data === undefined);
  const requiredDependencyStale =
    criticalQueries.some(
      (query) => query.isError && query.data !== undefined,
    ) ||
    (tenantSettingsRequired &&
      tenantSettingsQuery.isError &&
      tenantSettingsQuery.data !== undefined) ||
    (tablesRequired && tablesQuery.isError && tablesQuery.data !== undefined);
  const optionalDependencyStale = [
    combosQuery,
    promotionsQuery,
    customerGroupsQuery,
    priceRulesQuery,
  ].some((query) => query.isError && query.data !== undefined);
  const optionalDependencyFailed = [
    combosQuery,
    promotionsQuery,
    customerGroupsQuery,
    priceRulesQuery,
  ].some((query) => query.isError && query.data === undefined);

  const retryDependencies = useCallback(async () => {
    await Promise.all([
      categoriesQuery.refetch(),
      activeMenusQuery.refetch(),
      branchQuery.refetch(),
      ...(tenantSettingsRequired ? [tenantSettingsQuery.refetch()] : []),
      ...(tablesRequired ? [tablesQuery.refetch()] : []),
      ...(!isAddingToExisting
        ? [
            combosQuery.refetch(),
            customerGroupsQuery.refetch(),
            priceRulesQuery.refetch(),
          ]
        : []),
      promotionsQuery.refetch(),
    ]);
  }, [
    activeMenusQuery,
    branchQuery,
    categoriesQuery,
    combosQuery,
    customerGroupsQuery,
    isAddingToExisting,
    priceRulesQuery,
    promotionsQuery,
    tablesQuery,
    tablesRequired,
    tenantSettingsQuery,
    tenantSettingsRequired,
  ]);

  const isRetryingDependencies =
    criticalQueries.some((query) => query.isFetching) ||
    (tenantSettingsRequired && tenantSettingsQuery.isFetching) ||
    (tablesRequired && tablesQuery.isFetching);

  return {
    activeMenus,
    scopedCategories,
    menuLoading,
    courseSequencingAvailable:
      tenantSettingsQuery.data?.courseSequencingEnabled === true,
    activeCombos: (combosQuery.data ?? []).filter(
      (combo) => combo.status === "ACTIVE",
    ),
    promotions: promotionsQuery.data ?? [],
    customerGroups: customerGroupsQuery.data ?? [],
    perCoverRules: (priceRulesQuery.data ?? []).filter(
      (rule) => rule.isPerCover,
    ),
    menuById,
    availableOrderTypes,
    tablesEnabled,
    tables: tablesQuery.data,
    customerResults: customerSearchQuery.data,
    allItems,
    resolvedActiveCategory,
    activeItems,
    requiredDependencyLoading,
    requiredDependencyFailed,
    requiredDependencyStale,
    optionalDependencyFailed,
    optionalDependencyStale,
    retryDependencies,
    isRetryingDependencies,
  };
};
