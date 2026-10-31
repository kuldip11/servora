import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/auth";
import { menusService } from "../services/menus.service";
import { menuMutationSync } from "../query-sync";
import {
  useSetMenuPublished,
  useUpdateMenuMembership,
} from "../hooks/useMenus";

vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("../services/menus.service", () => ({
  menusService: {
    publish: vi.fn(),
    unpublish: vi.fn(),
    assignItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

const keys = {
  management: ["menu", "franchise", "t1", "menus"],
  categories: ["menu", "branch-context", "t1", "b1", "categories"],
  dineIn: ["menu", "branch-context", "t1", "b1", "active-menus", "DINE_IN"],
  takeaway: ["menu", "branch-context", "t1", "b1", "active-menus", "TAKEAWAY"],
  otherBranch: [
    "menu",
    "branch-context",
    "t1",
    "b2",
    "active-menus",
    "DINE_IN",
  ],
  availability: [
    "availability",
    "branch-context",
    "t1",
    "b1",
    "dashboard",
    "STAFF",
    "DINE_IN",
    "all",
  ],
  otherTenant: [
    "menu",
    "branch-context",
    "t2",
    "b3",
    "active-menus",
    "DINE_IN",
  ],
  unrelated: ["menu", "branch-context", "t1", "b1", "loyalty-tiers"],
} as const;
const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  Object.values(keys).forEach((key) => client.setQueryData(key, []));
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
};
const invalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated;

beforeEach(() => useAuthStore.setState({ franchiseId: "t1", branchId: "b1" }));
describe("menu mutation synchronization", () => {
  it.each([true, false])(
    "refreshes ordering dependencies after published=%s",
    async (published) => {
      const { client, wrapper } = setup();
      const h = renderHook(() => useSetMenuPublished(), { wrapper });
      await act(() => h.result.current.mutateAsync({ id: "m1", published }));
      for (const key of [
        keys.management,
        keys.categories,
        keys.dineIn,
        keys.takeaway,
        keys.otherBranch,
        keys.availability,
      ]) {
        expect(invalidated(client, key)).toBe(true);
      }
      expect(invalidated(client, keys.otherTenant)).toBe(false);
      expect(invalidated(client, keys.unrelated)).toBe(false);
      h.unmount();
      client.clear();
    },
  );
  it.each(["c1", null])(
    "refreshes ordering memberships on assignment/removal %s",
    async (categoryId) => {
      const { client, wrapper } = setup();
      const h = renderHook(() => useUpdateMenuMembership("i1"), { wrapper });
      await act(() =>
        h.result.current.mutateAsync({ menuId: "m1", categoryId }),
      );
      expect(invalidated(client, keys.categories)).toBe(true);
      expect(invalidated(client, keys.dineIn)).toBe(true);
      expect(invalidated(client, keys.takeaway)).toBe(true);
      h.unmount();
      client.clear();
    },
  );
  it("keeps mutation context when the hook rerenders during an in-flight request", async () => {
    const { client, wrapper } = setup();
    let release!: () => void;
    vi.mocked(menusService.publish).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(undefined as never);
        }),
    );
    const h = renderHook(() => useSetMenuPublished(), { wrapper });
    let mutation!: Promise<unknown>;
    await act(async () => {
      mutation = h.result.current.mutateAsync({ id: "m1", published: true });
      await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    });
    useAuthStore.setState({ franchiseId: "t2", branchId: "b3" });
    h.rerender();
    await act(async () => {
      release();
      await mutation;
    });
    expect(invalidated(client, keys.dineIn)).toBe(true);
    expect(invalidated(client, keys.otherTenant)).toBe(false);
    h.unmount();
    client.clear();
  });

  it("scopes override synchronization to its branch and retains the captured tenant across switches", async () => {
    const { client } = setup();
    const sync = menuMutationSync(client);
    useAuthStore.setState({ franchiseId: "t2", branchId: "b3" });
    await sync.invalidate("b1");
    expect(invalidated(client, keys.dineIn)).toBe(true);
    expect(invalidated(client, keys.availability)).toBe(true);
    expect(invalidated(client, keys.otherBranch)).toBe(false);
    expect(invalidated(client, keys.otherTenant)).toBe(false);
    client.clear();
  });
});
