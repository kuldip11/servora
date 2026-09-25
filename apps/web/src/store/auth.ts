import { queryClient } from "@/shared/lib/query-client";
import { create } from "zustand";
import type { AvailableMembership, User } from "@pos/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;

  membershipId: string | null;
  organizationId: string | null;
  memberships: AvailableMembership[];
  franchiseId: string | null;
  branchId: string | null;
  isAuthenticated: boolean;
  contextPending: boolean;
  contextVersion: number;
  setContextPending: (pending: boolean) => void;

  setAuth: (data: {
    user: User;
    accessToken: string;
    membershipId?: string | null;
    memberships?: AvailableMembership[];
  }) => void;
  setAccessToken: (accessToken: string) => void;
  setContext: (data: {
    membershipId: string | null;
    organizationId?: string | null;
    franchiseId: string | null;
    memberships?: AvailableMembership[];
    branchId?: string | null;
    user?: User | null;
  }) => void;
  setBranchId: (branchId: string | null) => void;
  logout: () => void;
}

// Query cancellation aborts synchronously; clear before publishing new request headers.
const resetServerState = () => {
  void queryClient.cancelQueries();
  queryClient.clear();
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  membershipId: null,
  organizationId: null,
  memberships: [],
  franchiseId: null,
  branchId: null,
  isAuthenticated: false,
  contextPending: false,
  contextVersion: 0,
  setContextPending: (contextPending) => set({ contextPending }),

  setAuth: ({ user, accessToken, membershipId = null, memberships = [] }) => {
    resetServerState();
    set({
      contextVersion: get().contextVersion + 1,
      contextPending: false,
      user,
      accessToken,
      membershipId,
      organizationId: null,
      memberships,
      franchiseId: user.tenantId ?? null,
      branchId: user.branchId ?? null,
      isAuthenticated: true,
    });
  },

  setContext: ({
    membershipId,
    organizationId,
    franchiseId,
    memberships,
    branchId,
    user,
  }) => {
    const previous = get();
    const changed =
      previous.membershipId !== membershipId ||
      previous.franchiseId !== franchiseId ||
      previous.branchId !== (branchId ?? null);
    if (changed) resetServerState();
    set((state) => ({
      contextVersion: state.contextVersion + (changed ? 1 : 0),
      membershipId,
      ...(organizationId !== undefined ? { organizationId } : {}),
      franchiseId,
      ...(memberships !== undefined ? { memberships } : {}),
      branchId: branchId ?? null,
      ...(user !== undefined ? { user } : {}),
      isAuthenticated: state.isAuthenticated || Boolean(state.accessToken),
    }));
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, isAuthenticated: true });
  },

  setBranchId: (branchId) => {
    if (get().branchId === branchId) return;
    resetServerState();
    set({ branchId, contextVersion: get().contextVersion + 1 });
  },

  logout: () => {
    resetServerState();
    localStorage.removeItem("servora.active-context.v1");
    set({
      contextPending: false,
      contextVersion: get().contextVersion + 1,
      user: null,
      accessToken: null,
      membershipId: null,
      organizationId: null,
      memberships: [],
      franchiseId: null,
      branchId: null,
      isAuthenticated: false,
    });
  },
}));
