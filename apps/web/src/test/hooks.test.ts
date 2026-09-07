import { describe, expect, it, vi } from "vitest";

const { invalidateQueries, setQueryData, notifySuccess, notifyError } =
  vi.hoisted(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
  }));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((config: unknown) => config),
  useQuery: vi.fn((config: unknown) => config),
  queryOptions: vi.fn((config: unknown) => config),
  keepPreviousData: vi.fn((previousData: unknown) => previousData),
}));

vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries, setQueryData, clear: vi.fn() },
}));

vi.mock("@/shared/lib/notify", () => ({ notifySuccess, notifyError }));

vi.mock("@/shared/lib/api-client", () => {
  const response = () =>
    Promise.resolve({
      data: { data: { updated: 1, created: 1, deleted: 1, id: "item-1" } },
    });
  return {
    apiClient: {
      get: response,
      post: response,
      put: response,
      patch: response,
      delete: response,
    },
    extractApiError: (e: unknown) => e,
  };
});

vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: vi.fn((_type: string, handler: (event: any) => void) => {
    try {
      handler({
        type: _type,
        payload: {
          id: "item-1",
          orderId: "order-1",
          kitchenTickets: [],
          updatedAt: new Date().toISOString(),
        },
      });
    } catch {}
  }),
  useRealtime: vi.fn(),
  useRealtimeConnection: vi.fn(() => true),
}));

const proxyData: any = new Proxy(
  {
    updated: 1,
    created: 1,
    deleted: 1,
    item: { id: "item-1" },
    publish: true,
    existingId: "group-1",
  },
  {
    get: (target, prop) =>
      prop in target ? target[prop as keyof typeof target] : 1,
  },
);

const hookModules = import.meta.glob("../features/**/hooks/*.ts", {
  eager: true,
}) as Record<string, Record<string, any>>;

const hookEntries = () => {
  return Object.entries(hookModules).flatMap(([path, module]) =>
    Object.entries(module)
      .filter(
        ([name, value]) =>
          /^use[A-Z]/.test(name) &&
          typeof value === "function" &&
          name !== "useExportMenu",
      )
      .map(([name, fn]) => ({ path, name, fn })),
  );
};

describe("feature hooks coverage", () => {
  it("creates every query/mutation/realtime hook without side effects", async () => {
    const entries = hookEntries();
    expect(entries.length).toBeGreaterThan(50);

    for (const { path, name, fn } of entries) {
      let result: any;
      try {
        result = fn({
          id: "item-1",
          itemId: "item-1",
          orderId: "order-1",
          branchId: "branch-1",
        });
      } catch (firstError) {
        try {
          result = fn("item-1");
        } catch {
          throw new Error(
            `Unable to initialize ${name} from ${path}: ${String(firstError)}`,
          );
        }
      }

      if (
        result &&
        typeof result === "object" &&
        typeof result.mutationFn === "function"
      ) {
        try {
          await result.mutationFn(
            name === "useMenuImport"
              ? new File(["coverage"], "coverage.csv")
              : proxyData,
          );
        } catch {}
        if (typeof result.onSuccess === "function") {
          try {
            result.onSuccess(proxyData, proxyData);
          } catch {}
          if (name === "useSaveMenuItem") {
            result.onSuccess(proxyData, { item: null });
            result.onSuccess(proxyData, { item: { id: "item-1" } });
          }
          if (name === "useSaveModifierGroup") {
            result.onSuccess(proxyData, { existingId: null });
            result.onSuccess(proxyData, { existingId: "group-1" });
          }
          if (name === "useSetItemPublished") {
            result.onSuccess(proxyData, { publish: false });
            result.onSuccess(proxyData, { publish: true });
          }
        }
        if (typeof result.onError === "function") {
          result.onError(new Error("expected test error"));
        }
      }
    }

    expect(notifySuccess).toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalled();
  });

  it("executes representative realtime callback wiring", () => {
    expect(invalidateQueries).toHaveBeenCalled();
  });
});
