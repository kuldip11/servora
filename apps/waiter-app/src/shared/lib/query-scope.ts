import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

export type WaiterQueryScope = readonly [
  tenantId: string | null,
  branchId: string | null,
];

export const getWaiterQueryScope = (): WaiterQueryScope => [
  localStorage.getItem(STORAGE_KEYS.tenant),
  localStorage.getItem(STORAGE_KEYS.branch),
];
