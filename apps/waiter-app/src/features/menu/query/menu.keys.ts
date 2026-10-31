import type { WaiterQueryScope } from "@/shared/lib/query-scope";

export const menuKeys = {
  all: (scope: WaiterQueryScope) => ["waiter-menu", ...scope] as const,
  categories: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "categories"] as const,
  activeMenus: (scope: WaiterQueryScope, orderType: string) =>
    [...menuKeys.all(scope), "active", orderType] as const,
  combos: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "combos"] as const,
  promotions: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "promotions"] as const,
  priceRules: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "price-rules", "per-cover"] as const,
  customerGroups: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "customer-groups"] as const,
  customerSearch: (scope: WaiterQueryScope, query: string) =>
    [...menuKeys.all(scope), "customer-search", query] as const,
  branch: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "branch"] as const,
  tables: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "tables"] as const,
  tenantSettings: (scope: WaiterQueryScope) =>
    [...menuKeys.all(scope), "tenant-settings"] as const,
};
