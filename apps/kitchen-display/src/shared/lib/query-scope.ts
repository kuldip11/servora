import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

export type KitchenQueryScope = readonly [
  tenantId: string | null,
  branchId: string | null,
];

export const getKitchenQueryScope = (): KitchenQueryScope => [
  sessionStorage.getItem(STORAGE_KEYS.tenant),
  sessionStorage.getItem(STORAGE_KEYS.branch),
];
