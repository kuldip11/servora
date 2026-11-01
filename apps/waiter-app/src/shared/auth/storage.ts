import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import type { AuthUserDto as User } from "@pos/api-client";

let accessToken: string | null = null;

export const saveTokens = (token: string) => {
  accessToken = token;
};

export const clearTokens = () => {
  accessToken = null;
  localStorage.removeItem(STORAGE_KEYS.tenant);
  localStorage.removeItem(STORAGE_KEYS.branch);
};

export const saveContext = (franchiseId: string, branchId: string | null) => {
  localStorage.setItem(STORAGE_KEYS.tenant, franchiseId);
  if (branchId) localStorage.setItem(STORAGE_KEYS.branch, branchId);
  else localStorage.removeItem(STORAGE_KEYS.branch);
};

export const saveProfile = (user: User) => {
  localStorage.setItem(STORAGE_KEYS.name, `${user.firstName} ${user.lastName}`);
  localStorage.setItem(
    STORAGE_KEYS.permissions,
    JSON.stringify(
      Array.from(
        new Set(
          (user.roles ?? []).flatMap((role) =>
            role.permissions.map((permission) => permission.key),
          ),
        ),
      ),
    ),
  );
};

export const hasPermission = (permission: string): boolean => {
  try {
    return (
      JSON.parse(
        localStorage.getItem(STORAGE_KEYS.permissions) ?? "[]",
      ) as string[]
    ).includes(permission);
  } catch {
    return false;
  }
};

export const getToken = (): string | null => accessToken;

export const getWaiterName = (): string => {
  return localStorage.getItem(STORAGE_KEYS.name) ?? "Waiter";
};

export const logout = () => {
  accessToken = null;
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};
