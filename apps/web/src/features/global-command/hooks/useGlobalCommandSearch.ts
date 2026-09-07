import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Package,
  ShoppingBag,
  Table2,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/shared/auth/permissions";
import { useAuthStore } from "@/store/auth";
import { persistActiveContext } from "@/shared/auth/active-context";
import { ordersService } from "@/features/orders/services/orders.service";
import { staffService } from "@/features/staff/services/staff.service";
import { inventoryService } from "@/features/inventory/services/inventory.service";
import { menuItemsService } from "@/features/menu/services/menu-items.service";
import { tablesService } from "@/features/tables/services/tables.service";
import { GLOBAL_NAVIGATION_ITEMS } from "@/features/global-command/constants";
import {
  matchesGlobalSearch,
  normalizeSearchText,
} from "@/features/global-command/utils";
import type { GlobalCommandResult } from "@/features/global-command/types";

const SEARCH_LIMIT = 8;

export const useGlobalCommandSearch = (
  query: string,
  enabled: boolean,
  onSelect: () => void,
) => {
  const router = useRouter();
  const { has } = usePermissions();
  const { memberships, membershipId, branchId, setContext } = useAuthStore();
  const normalizedQuery = normalizeSearchText(query);
  const [entityQuery, setEntityQuery] = useState("");

  useEffect(() => {
    if (!enabled || normalizedQuery.length < 2) {
      setEntityQuery("");
      return;
    }
    const timer = window.setTimeout(() => setEntityQuery(normalizedQuery), 250);
    return () => window.clearTimeout(timer);
  }, [enabled, normalizedQuery]);

  const shouldSearchEntities = enabled && entityQuery.length >= 2;

  const shouldSearchOrders =
    shouldSearchEntities && entityQuery.replace(/^#/, "").length >= 8;

  const orders = useQuery({
    queryKey: ["global-command", "orders", entityQuery],
    queryFn: () => ordersService.search(entityQuery, SEARCH_LIMIT),
    enabled: shouldSearchOrders && has("orders:read"),
    staleTime: 15_000,
  });

  const staff = useQuery({
    queryKey: ["global-command", "staff", entityQuery],
    queryFn: () =>
      staffService.list({ search: entityQuery, limit: SEARCH_LIMIT }),
    enabled: shouldSearchEntities && has("staff:read"),
    staleTime: 30_000,
  });

  const inventory = useQuery({
    queryKey: ["global-command", "inventory", entityQuery],
    queryFn: () =>
      inventoryService.list({ search: entityQuery, limit: SEARCH_LIMIT }),
    enabled: shouldSearchEntities && has("inventory:read"),
    staleTime: 30_000,
  });

  const menu = useQuery({
    queryKey: ["global-command", "menu"],
    queryFn: () => menuItemsService.listCategories(),
    enabled: shouldSearchEntities && has("menu:read"),
    staleTime: 5 * 60_000,
  });

  const tables = useQuery({
    queryKey: ["global-command", "tables", branchId],
    queryFn: () => tablesService.list(),
    enabled:
      shouldSearchEntities &&
      has("tables:read") &&
      Boolean(branchId) &&
      branchId !== "all",
    staleTime: 30_000,
  });

  const navigate = (to: string) => {
    onSelect();
    void router.navigate({ to });
  };

  const navigationResults = useMemo<GlobalCommandResult[]>(() => {
    return GLOBAL_NAVIGATION_ITEMS.filter(
      (item) =>
        !("permission" in item) || !item.permission || has(item.permission),
    )
      .filter((item) =>
        matchesGlobalSearch(normalizedQuery, [item.label, ...item.keywords]),
      )
      .map((item) => ({
        id: `nav:${item.to}`,
        kind: "navigation",
        label: item.label,
        description: `Go to ${item.label}`,
        keywords: [...item.keywords],
        icon: item.icon,
        action: () => navigate(item.to),
      }));
  }, [has, normalizedQuery]);

  const entityResults = useMemo<GlobalCommandResult[]>(() => {
    if (!shouldSearchEntities) return [];

    const results: GlobalCommandResult[] = [];

    for (const order of orders.data ?? []) {
      const shortId = order.id.slice(-8).toUpperCase();
      results.push({
        id: `order:${order.id}`,
        kind: "order",
        label: order.tableName
          ? `Table ${order.tableName}`
          : `Order #${shortId}`,
        description: `Order #${shortId} · ${order.status.replaceAll("_", " ")}`,
        icon: ShoppingBag,
        action: () => {
          onSelect();
          void router.navigate({
            to: "/orders/$orderId",
            params: { orderId: order.id },
          });
        },
      });
    }

    for (const category of menu.data ?? []) {
      for (const item of category.menuItems ?? []) {
        if (
          !matchesGlobalSearch(entityQuery, [
            item.name,
            item.sku,
            category.name,
          ])
        )
          continue;
        results.push({
          id: `menu-item:${item.id}`,
          kind: "menu-item",
          label: item.name,
          description: `${category.name}${item.sku ? ` · SKU ${item.sku}` : ""}`,
          icon: UtensilsCrossed,
          action: () => navigate("/menu"),
        });
        if (
          results.filter((result) => result.kind === "menu-item").length >=
          SEARCH_LIMIT
        )
          break;
      }
    }

    for (const person of staff.data?.items ?? []) {
      const name =
        [person.firstName, person.lastName].filter(Boolean).join(" ") ||
        person.email ||
        "Staff member";
      results.push({
        id: `staff:${person.id}`,
        kind: "staff",
        label: name,
        description: [person.email, person.roles?.[0]?.name]
          .filter(Boolean)
          .join(" · "),
        icon: UserRound,
        action: () => navigate("/staff"),
      });
    }

    for (const item of inventory.data?.items ?? []) {
      results.push({
        id: `inventory:${item.id}`,
        kind: "inventory",
        label: item.name,
        description: `${item.currentStock} ${item.unit} in stock${item.branch?.name ? ` · ${item.branch.name}` : ""}`,
        icon: Package,
        action: () => navigate("/inventory"),
      });
    }

    const tableRows = Array.isArray(tables.data) ? tables.data : [];
    for (const table of tableRows) {
      if (!matchesGlobalSearch(entityQuery, [table.name, table.section]))
        continue;
      results.push({
        id: `table:${table.id}`,
        kind: "table",
        label: `Table ${table.name}`,
        description: `${table.status.replaceAll("_", " ")} · ${table.capacity} seats${table.section ? ` · ${table.section}` : ""}`,
        icon: Table2,
        action: () => navigate("/tables"),
      });
    }

    const activeMembership = memberships.find(
      (membership) => membership.membershipId === membershipId,
    );
    for (const branch of activeMembership?.branches ?? []) {
      if (!matchesGlobalSearch(entityQuery, [branch.name, branch.address]))
        continue;
      results.push({
        id: `branch:${branch.id}`,
        kind: "branch",
        label: branch.name,
        description:
          branch.id === branchId
            ? "Current branch"
            : `Switch branch${branch.address ? ` · ${branch.address}` : ""}`,
        icon: Building2,
        action: () => {
          if (!activeMembership) return;
          setContext({
            membershipId: activeMembership.membershipId,
            franchiseId: activeMembership.tenant.id,
            branchId: branch.id,
          });
          persistActiveContext({
            membershipId: activeMembership.membershipId,
            franchiseId: activeMembership.tenant.id,
            branchId: branch.id,
          });
          onSelect();
        },
      });
    }

    return results;
  }, [
    has,
    inventory.data,
    memberships,
    membershipId,
    menu.data,
    entityQuery,
    normalizedQuery,
    orders.data,
    shouldSearchEntities,
    staff.data,
    tables.data,
    branchId,
    setContext,
  ]);

  return {
    navigationResults,
    entityResults,
    isSearching:
      shouldSearchEntities &&
      (orders.isFetching ||
        staff.isFetching ||
        inventory.isFetching ||
        menu.isFetching ||
        tables.isFetching),
  };
};
