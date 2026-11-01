import {
  createAuthApi,
  type AuthResponse,
  type AvailableMembershipDto as AvailableMembership,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { saveContext, saveProfile, saveTokens } from "@/shared/auth/storage";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

const authApi = createAuthApi(apiClient);
export type { AuthResponse };

export const login = (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  return authApi.login({ email, password });
};
export const fetchMemberships = authApi.memberships;
export const refreshSession = authApi.refresh;
export const fetchMe = authApi.me;

export const resolveWaiterContext = (
  memberships: AvailableMembership[],
  savedTenantId: string | null,
  savedBranchId: string | null,
): { tenantId: string; branchId: string } | null => {
  const membership =
    memberships.find((item) => item.tenant.id === savedTenantId) ??
    memberships[0];
  if (!membership) return null;

  const branch =
    membership.branches.find((item) => item.id === savedBranchId) ??
    membership.branches.find((item) => item.isActive !== false);
  if (!branch) return null;

  return { tenantId: membership.tenant.id, branchId: branch.id };
};

export const restoreSession = async (): Promise<boolean> => {
  const refreshed = await authApi.refresh();
  saveTokens(refreshed.accessToken);
  const memberships = await authApi.memberships();
  const context = resolveWaiterContext(
    memberships,
    localStorage.getItem(STORAGE_KEYS.tenant),
    localStorage.getItem(STORAGE_KEYS.branch),
  );
  if (!context) {
    throw new Error("No active branch is assigned to this waiter account.");
  }
  saveContext(context.tenantId, context.branchId);
  const user = await authApi.me();
  saveProfile(user);
  return true;
};

export const logoutSession = authApi.logout;
