import type { User } from "@pos/types";
import { getUserPermissions } from "@/shared/auth/permissions";

export type AuthorizedHomePath =
  | "/dashboard"
  | "/orders"
  | "/menu"
  | "/tables"
  | "/inventory"
  | "/billing"
  | "/staff"
  | "/branches"
  | "/audit"
  | "/settings";

export const getAuthorizedHomePath = (
  user: User | null,
): AuthorizedHomePath => {
  const permissions = getUserPermissions(user);
  const roleNames = new Set((user?.roles ?? []).map((role) => role.name));

  if (roleNames.has("CASHIER") && permissions.has("billing:read"))
    return "/billing";
  if (roleNames.has("INVENTORY_MANAGER") && permissions.has("inventory:read"))
    return "/inventory";
  if (roleNames.has("RECEPTIONIST") && permissions.has("tables:read"))
    return "/tables";
  if (permissions.has("analytics:read")) return "/dashboard";
  if (permissions.has("orders:read")) return "/orders";
  if (permissions.has("menu:read")) return "/menu";
  if (permissions.has("tables:read")) return "/tables";
  if (permissions.has("inventory:read")) return "/inventory";
  if (permissions.has("billing:read")) return "/billing";
  if (permissions.has("staff:read")) return "/staff";
  if (permissions.has("branch:read")) return "/branches";
  if (permissions.has("audit:read")) return "/audit";
  return "/settings";
};
