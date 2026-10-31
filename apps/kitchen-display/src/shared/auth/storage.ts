import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

let accessToken: string | null = null;

export const saveTokens = (token: string) => {
  accessToken = token;
};

export const clearTokens = () => {
  accessToken = null;
  sessionStorage.removeItem(STORAGE_KEYS.tenant);
  sessionStorage.removeItem(STORAGE_KEYS.branch);
};

export const saveContext = (franchiseId: string, branchId: string | null) => {
  sessionStorage.setItem(STORAGE_KEYS.tenant, franchiseId);
  if (branchId) sessionStorage.setItem(STORAGE_KEYS.branch, branchId);
  else sessionStorage.removeItem(STORAGE_KEYS.branch);
};

export const getToken = (): string | null => accessToken;

export const logout = () => {
  accessToken = null;
  Object.values(STORAGE_KEYS).forEach((key) => sessionStorage.removeItem(key));
};
