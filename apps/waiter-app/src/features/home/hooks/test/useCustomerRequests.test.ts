import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  queryConfigs,
  mutationConfigs,
  realtimeHandlers,
  qc,
  api,
  toast,
  extract,
} = vi.hoisted(() => ({
  queryConfigs: [] as any[],
  mutationConfigs: [] as any[],
  realtimeHandlers: new Map<string, Function>(),
  qc: { setQueryData: vi.fn() },
  api: { listRequests: vi.fn(), resolveRequest: vi.fn() },
  toast: vi.fn(),
  extract: vi.fn((_error: unknown, fallback?: string) => fallback ?? "error"),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => qc,
  useQuery: (config: any) => {
    queryConfigs.push(config);
    return config;
  },
  useMutation: (config: any) => {
    mutationConfigs.push(config);
    return config;
  },
}));
vi.mock("@pos/api-client", () => ({
  createCustomersApi: () => api,
  extractApiError: extract,
}));
vi.mock("@pos/ui", () => ({ toast }));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/shared/lib/realtime", () => ({
  useRealtimeEvent: (name: string, handler: Function) =>
    realtimeHandlers.set(name, handler),
}));

import {
  CUSTOMER_REQUESTS_QUERY_KEY,
  useCustomerRequests,
  useResolveCustomerRequest,
} from "../useCustomerRequests";

beforeEach(() => {
  queryConfigs.length = 0;
  mutationConfigs.length = 0;
  realtimeHandlers.clear();
  vi.clearAllMocks();
});

describe("useCustomerRequests", () => {
  it("polls requests and merges realtime create/update events", async () => {
    useCustomerRequests();
    const config = queryConfigs.at(-1)!;
    await config.queryFn();
    expect(config.queryKey).toEqual(CUSTOMER_REQUESTS_QUERY_KEY);
    expect(config.refetchInterval).toBe(10_000);

    realtimeHandlers.get("customer.request.created")!({
      payload: {
        id: "r1",
        tableId: "t1",
        orderId: null,
        type: "WATER",
        status: "OPEN",
      },
    });
    const createUpdater = qc.setQueryData.mock.calls.at(-1)![1];
    expect(createUpdater([])).toHaveLength(1);
    expect(createUpdater([{ id: "r1" }])).toHaveLength(1);

    realtimeHandlers.get("customer.request.updated")!({
      payload: { id: "r1", status: "RESOLVED" },
    });
    const updateUpdater = qc.setQueryData.mock.calls.at(-1)![1];
    expect(updateUpdater([{ id: "r1" }, { id: "r2" }])).toEqual([{ id: "r2" }]);
  });

  it("resolves a request, updates cache, and surfaces structured errors", async () => {
    useResolveCustomerRequest();
    const config = mutationConfigs.at(-1)!;
    await config.mutationFn("r1");
    config.onSuccess(undefined, "r1");
    const updater = qc.setQueryData.mock.calls.at(-1)![1];
    expect(updater([{ id: "r1" }, { id: "r2" }])).toEqual([{ id: "r2" }]);

    config.onError(new Error("offline"));
    expect(extract).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({
      title: "Failed to resolve customer request",
      tone: "danger",
    });
  });
});
