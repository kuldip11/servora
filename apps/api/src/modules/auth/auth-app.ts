import { ForbiddenError, UnauthorizedError } from "@/core/errors";

export const AUTH_APP_HEADER = "x-servora-app";

export const AUTH_APPS = ["web", "kitchen", "waiter"] as const;
export type AuthApp = (typeof AUTH_APPS)[number];

const AUTH_APP_SET = new Set<string>(AUTH_APPS);

const APP_SYSTEM_ROLE_ACCESS: Record<AuthApp, ReadonlySet<string>> = {
  web: new Set([
    "OWNER",
    "FRANCHISE_ADMIN",
    "MANAGER",
    "CASHIER",
    "INVENTORY_MANAGER",
    "RECEPTIONIST",
    "ACCOUNTANT",
  ]),
  kitchen: new Set(["OWNER", "FRANCHISE_ADMIN", "MANAGER", "CHEF"]),
  waiter: new Set(["OWNER", "FRANCHISE_ADMIN", "MANAGER", "WAITER"]),
};

const CUSTOM_ROLE_APP_CAPABILITIES: Record<
  AuthApp,
  { all?: readonly string[]; any: readonly string[] }
> = {
  web: {
    any: [
      "analytics:read",
      "billing:read",
      "inventory:read",
      "staff:read",
      "settings:read",
      "roles:read",
      "branch:create",
      "branch:update",
      "organization:manage",
      "tenant:update",
      "menu:create",
      "menu:update",
      "menu:pricing:write",
    ],
  },
  kitchen: { all: ["kitchen:read"], any: ["kitchen:update"] },
  waiter: {
    all: ["menu:read", "orders:read"],
    any: ["orders:create", "orders:update", "orders:update_status"],
  },
};

export const parseAuthApp = (value: string | undefined): AuthApp => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!AUTH_APP_SET.has(normalized)) {
    throw new UnauthorizedError("Application identity is missing or invalid");
  }
  return normalized as AuthApp;
};

export const hasAppRoleAccess = (
  app: AuthApp,
  roleNames: readonly string[],
): boolean =>
  roleNames.some((roleName) => APP_SYSTEM_ROLE_ACCESS[app].has(roleName));

export const hasMembershipAppAccess = (
  app: AuthApp,
  roles: readonly { name: string; isSystem: boolean }[],
  permissionKeys: readonly string[],
): boolean => {
  if (
    roles.some(
      (role) => role.isSystem && APP_SYSTEM_ROLE_ACCESS[app].has(role.name),
    )
  ) {
    return true;
  }

  const customRoles = roles.filter((role) => !role.isSystem);
  if (customRoles.length === 0) return false;

  const permissions = new Set(permissionKeys);
  const capability = CUSTOM_ROLE_APP_CAPABILITIES[app];
  const hasAll = (capability.all ?? []).every((key) => permissions.has(key));
  const hasAny = capability.any.some((key) => permissions.has(key));
  return hasAll && hasAny;
};

export const assertAppRoleAccess = (
  app: AuthApp,
  roleNames: readonly string[],
): void => {
  if (!hasAppRoleAccess(app, roleNames)) {
    throw new ForbiddenError(
      "Account does not have access to this application",
    );
  }
};

export const assertMembershipAppAccess = (
  app: AuthApp,
  roles: readonly { name: string; isSystem: boolean }[],
  permissionKeys: readonly string[],
): void => {
  if (!hasMembershipAppAccess(app, roles, permissionKeys)) {
    throw new ForbiddenError(
      "Account does not have access to this application",
    );
  }
};

export const assertTokenApp = (
  tokenApp: string | undefined,
  requestApp: AuthApp,
): void => {
  if (tokenApp !== requestApp) {
    throw new ForbiddenError("Session is not valid for this application");
  }
};
