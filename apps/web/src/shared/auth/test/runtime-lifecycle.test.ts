import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { queryClient } from "@/shared/lib/query-client";
import { useAuthStore } from "@/store/auth";
import {
  activateMembershipContext,
  persistActiveContext,
} from "@/shared/auth/active-context";
import { bootstrapAuthSession } from "@/shared/auth/bootstrap";
const h = vi.hoisted(() => ({
  me: vi.fn(),
  refresh: vi.fn(),
  memberships: vi.fn(),
}));
vi.mock("@/features/auth/services/auth.service", () => ({ authService: h }));
const membership = (id: string) =>
  ({
    membershipId: id,
    tenant: { id },
    roles: [],
    branches: [{ id: `${id}-branch` }],
  }) as any;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().logout();
  useAuthStore.getState().setAccessToken("token");
});
afterEach(() => queryClient.clear());

it.each(["branch", "membership", "logout", "login"])(
  "aborts and clears old server state before publishing %s changes",
  async (action) => {
    useAuthStore
      .getState()
      .setContext({ membershipId: "m1", franchiseId: "f1", branchId: "b1" });
    const done = deferred<string>();
    let signal!: AbortSignal;
    let headersAtAbort: string | null = null;
    queryClient.setQueryData(["cached"], "private");
    const running = queryClient
      .fetchQuery({
        queryKey: ["active"],
        queryFn: (ctx) => {
          signal = ctx.signal;
          signal.addEventListener("abort", () => {
            headersAtAbort = useAuthStore.getState().branchId;
          });
          return done.promise;
        },
      })
      .catch(() => undefined);
    const revision = useAuthStore.getState().contextVersion;
    const store = useAuthStore.getState();
    if (action === "branch") store.setBranchId("b2");
    if (action === "membership")
      store.setContext({
        membershipId: "m2",
        franchiseId: "f2",
        branchId: "b2",
      });
    if (action === "logout") store.logout();
    if (action === "login")
      store.setAuth({ user: { id: "u2" } as any, accessToken: "new" });
    expect(signal.aborted).toBe(true);
    expect(headersAtAbort).toBe("b1");
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useAuthStore.getState().contextVersion).toBeGreaterThan(revision);
    done.resolve("late private result");
    await running;
    expect(queryClient.getQueryData(["active"])).toBeUndefined();
  },
);
it.each([401, 403])(
  "clears persisted context and cache on expired bootstrap (%i)",
  async (status) => {
    persistActiveContext({
      membershipId: "m1",
      franchiseId: "f1",
      branchId: "b1",
    });
    queryClient.setQueryData(["private"], "old");
    h.refresh.mockRejectedValue({ isAxiosError: true, response: { status } });
    expect(await bootstrapAuthSession()).toBe("unauthenticated");
    expect(localStorage.getItem("servora.active-context.v1")).toBeNull();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      branchId: null,
      franchiseId: null,
      isAuthenticated: false,
    });
  },
);
it("does not resurrect a context when /me finishes after logout", async () => {
  const me = deferred<any>();
  h.me.mockReturnValue(me.promise);
  const m = membership("a");
  const pending = activateMembershipContext(m, [m]);
  expect(useAuthStore.getState().contextPending).toBe(true);
  useAuthStore.getState().logout();
  me.resolve({ id: "old-user" });
  await pending;
  expect(useAuthStore.getState()).toMatchObject({
    user: null,
    membershipId: null,
    contextPending: false,
    isAuthenticated: false,
  });
});
it("keeps the newest context when /me replies arrive out of order", async () => {
  const first = deferred<any>();
  const second = deferred<any>();
  h.me.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const a = membership("a"),
    b = membership("b");
  const one = activateMembershipContext(a, [a, b]);
  const two = activateMembershipContext(b, [a, b]);
  second.resolve({ id: "new" });
  await two;
  first.resolve({ id: "stale" });
  await one;
  expect(useAuthStore.getState()).toMatchObject({
    membershipId: "b",
    user: { id: "new" },
    contextPending: false,
  });
});
it("clears failed context persistence and releases the pending UI", async () => {
  h.me.mockRejectedValue(new Error("unavailable"));
  const m = membership("a");
  await expect(activateMembershipContext(m, [m])).rejects.toThrow(
    "unavailable",
  );
  expect(localStorage.getItem("servora.active-context.v1")).toBeNull();
  expect(useAuthStore.getState()).toMatchObject({
    membershipId: null,
    contextPending: false,
  });
});
it("expires the session when membership loading rejects authentication", async () => {
  h.refresh.mockResolvedValue({ user: { id: "u1" }, accessToken: "token" });
  h.memberships.mockRejectedValue({
    isAxiosError: true,
    response: { status: 401 },
  });
  expect(await bootstrapAuthSession()).toBe("unauthenticated");
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
it("does not restore a bootstrap refresh after explicit logout", async () => {
  const refresh = deferred<any>();
  h.refresh.mockReturnValue(refresh.promise);
  const boot = bootstrapAuthSession();
  useAuthStore.getState().logout();
  refresh.resolve({ user: { id: "old" }, accessToken: "old" });
  expect(await boot).toBe("unauthenticated");
  expect(useAuthStore.getState().accessToken).toBeNull();
});
it("expires the session when the new context rejects /me", async () => {
  h.me.mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  const m = membership("a");
  await expect(activateMembershipContext(m, [m])).rejects.toMatchObject({
    response: { status: 401 },
  });
  expect(useAuthStore.getState()).toMatchObject({
    isAuthenticated: false,
    contextPending: false,
    user: null,
  });
});
it("ignores a late bootstrap authentication failure after a new login", async () => {
  let reject!: (reason: any) => void;
  h.refresh.mockReturnValue(
    new Promise((_resolve, r) => {
      reject = r;
    }),
  );
  const boot = bootstrapAuthSession();
  useAuthStore
    .getState()
    .setAuth({ user: { id: "new" } as any, accessToken: "new" });
  reject({ isAxiosError: true, response: { status: 401 } });
  expect(await boot).toBe("ready");
  expect(useAuthStore.getState().accessToken).toBe("new");
});
