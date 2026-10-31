import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => ({
  useMutation: vi.fn((config: unknown) => config),
}));
const queryClient = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const notify = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
const ordersService = vi.hoisted(() => ({
  create: vi.fn(),
  addItems: vi.fn(),
  compItem: vi.fn(),
  voidItem: vi.fn(),
  refireItem: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  ...query,
  useQueryClient: () => queryClient,
}));
vi.mock("../../../../shared/lib/query-client", () => ({ queryClient }));
vi.mock("../../../../shared/lib/notify", () => notify);
vi.mock("../../../../shared/lib/api-client", () => ({
  toApiClientError: () => ({ code: "UNKNOWN" }),
}));
vi.mock("../../services/orders.service", () => ({ ordersService }));
vi.mock("../../query-keys", () => ({
  orderKeys: {
    lists: () => ["orders", "list", "branch"],
    detail: (id: string) => ["orders", "detail", "branch", id],
  },
}));
vi.mock("../../../tables/query-keys", () => ({
  tableKeys: { list: () => ["tables", "branch", "list"] },
}));

import { useCreateOrder } from "@/features/orders/hooks/useCreateOrder";
import { useAddOrderItems } from "@/features/orders/hooks/useAddOrderItems";
import { useCompOrderItem } from "@/features/orders/hooks/useCompOrderItem";
import { useVoidOrderItem } from "@/features/orders/hooks/useVoidOrderItem";
import { useRefireOrderItem } from "@/features/orders/hooks/useRefireOrderItem";

type MutationConfig = { onSuccess: () => void };

const expectOrderListInvalidation = () => {
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ["orders", "list", "branch"],
  });
};

const expectOrderDetailInvalidation = (orderId: string) => {
  expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
    queryKey: ["orders", "detail", "branch", orderId],
  });
};

describe("order mutation invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps create-order invalidation scoped to current order/table lists", () => {
    const mutation = useCreateOrder() as unknown as MutationConfig;
    mutation.onSuccess();

    expectOrderListInvalidation();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["tables", "branch", "list"],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["add items", useAddOrderItems],
    ["comp item", useCompOrderItem],
    ["void item", useVoidOrderItem],
    ["refire item", useRefireOrderItem],
  ] as const)(
    "keeps %s invalidation scoped to the order detail and current list",
    (_name, hook) => {
      const mutation = hook("o1") as unknown as MutationConfig;
      mutation.onSuccess();

      expectOrderDetailInvalidation("o1");
      expectOrderListInvalidation();
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
    },
  );
});
