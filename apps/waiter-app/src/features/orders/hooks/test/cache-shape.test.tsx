import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchOrders: vi.fn() }));
vi.mock("@/features/orders/api/orders", () => mocks);
vi.mock("@/shared/lib/realtime", () => ({ useRealtimeEvent: vi.fn() }));
vi.mock("@/shared/lib/query-scope", () => ({
  getWaiterQueryScope: () => ["tenant", "branch"],
}));
import { useMergeCandidates } from "../useOrderActions";
import { useOrdersPage } from "../useOrders";

const envelope = {
  items: [{ id: "o1" }],
  pagination: { page: 1, total: 1, hasMore: false },
};

describe("shared order cache contract", () => {
  it.each(["candidates", "page"])(
    "preserves both observer shapes when %s loads first",
    async (first) => {
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: false } },
      });
      const wrapper = ({ children }: PropsWithChildren) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
      mocks.fetchOrders.mockClear().mockResolvedValue(envelope);
      const useFirst =
        first === "candidates"
          ? () => useMergeCandidates(true)
          : () => useOrdersPage({ view: "ACTIVE", limit: 100 });
      const firstHook = renderHook(() => useFirst(), { wrapper });
      await waitFor(() =>
        expect(firstHook.result.current.isSuccess).toBe(true),
      );
      const secondHook = renderHook(
        () => {
          const candidates = useMergeCandidates(true);
          const page = useOrdersPage({ view: "ACTIVE", limit: 100 });
          return { candidates, page };
        },
        { wrapper },
      );
      await waitFor(() =>
        expect(secondHook.result.current.page.data).toEqual(envelope),
      );
      expect(secondHook.result.current.candidates.data).toEqual(envelope.items);
      expect(mocks.fetchOrders).toHaveBeenCalledTimes(1);
      firstHook.unmount();
      secondHook.unmount();
      client.clear();
    },
  );
});
