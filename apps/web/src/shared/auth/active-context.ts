import { isAxiosError } from "axios";
import type { AvailableMembership } from "@pos/types";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";

const STORAGE_KEY = "servora.active-context.v1";
type SavedContext = {
  membershipId: string;
  franchiseId: string;
  branchId: string;
};

const readSavedContext = (): SavedContext | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as SavedContext) : null;
  } catch {
    return null;
  }
};

export const persistActiveContext = (context: SavedContext) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
};

export const clearPersistedContext = () => localStorage.removeItem(STORAGE_KEY);

const defaultBranchForMembership = (
  membership: AvailableMembership,
): string | null => {
  const saved = readSavedContext();
  if (saved?.membershipId === membership.membershipId) {
    if (
      saved.branchId === "all" &&
      membership.roles.some((role) => role.scope === "TENANT")
    )
      return null;
    if (membership.branches.some((branch) => branch.id === saved.branchId))
      return saved.branchId;
  }
  return membership.branches[0]?.id ?? null;
};

export const restoreActiveContext = async (
  memberships: AvailableMembership[],
) => {
  if (!memberships.length) return false;
  const saved = readSavedContext();
  const membership =
    memberships.find(
      (item) =>
        item.membershipId === saved?.membershipId &&
        item.tenant.id === saved.franchiseId,
    ) ?? memberships[0]!;
  await activateMembershipContext(membership, memberships);
  return true;
};

export const activateMembershipContext = async (
  membership: AvailableMembership,
  memberships: AvailableMembership[],
  organizationId?: string | null,
): Promise<void> => {
  const branchId = defaultBranchForMembership(membership);
  const store = useAuthStore.getState();

  store.setContextPending(true);
  store.setContext({
    membershipId: membership.membershipId,
    ...(organizationId !== undefined ? { organizationId } : {}),
    franchiseId: membership.tenant.id,
    memberships,
    branchId,
  });
  persistActiveContext({
    membershipId: membership.membershipId,
    franchiseId: membership.tenant.id,
    branchId: branchId ?? "all",
  });

  const version = useAuthStore.getState().contextVersion;
  try {
    const user = await authService.me();
    if (useAuthStore.getState().contextVersion !== version) return;
    useAuthStore.getState().setContext({
      membershipId: membership.membershipId,
      ...(organizationId !== undefined ? { organizationId } : {}),
      franchiseId: membership.tenant.id,
      memberships,
      branchId,
      user,
    });
  } catch (error) {
    if (useAuthStore.getState().contextVersion !== version) return;
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
      throw error;
    }
    clearPersistedContext();
    useAuthStore.getState().setContext({
      membershipId: null,
      organizationId: null,
      franchiseId: null,
      branchId: null,
    });
    throw error;
  } finally {
    const current = useAuthStore.getState();
    if (current.contextVersion === version || current.membershipId === null) {
      current.setContextPending(false);
    }
  }
};
