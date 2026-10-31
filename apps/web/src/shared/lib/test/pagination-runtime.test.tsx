import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { staffListQuery } from "@/features/staff/query-options";
import { inventoryItemsQuery } from "@/features/inventory/query-options";
const h = vi.hoisted(() => ({ staff: vi.fn(), inventory: vi.fn() }));
vi.mock("@/features/staff/services/staff.service", () => ({
  staffService: { list: h.staff },
}));
vi.mock("@/features/inventory/services/inventory.service", () => ({
  inventoryService: { list: h.inventory },
}));
afterEach(cleanup);
it.each(["staff", "inventory"] as const)(
  "keeps usable %s rows during pagination and background refetch",
  async (domain) => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = {
      items: [{ id: "first" }],
      pagination: { page: 1, total: 2 },
    };
    const second = {
      items: [{ id: "second" }],
      pagination: { page: 2, total: 2 },
    };
    let resolveNext!: (value: any) => void;
    h[domain]
      .mockReset()
      .mockResolvedValueOnce(first)
      .mockImplementation(
        () =>
          new Promise((r) => {
            resolveNext = r;
          }),
      );
    const options = domain === "staff" ? staffListQuery : inventoryItemsQuery;
    const { result, rerender, unmount } = renderHook(
      ({ page }) => useQuery(options({ page }) as any),
      { wrapper, initialProps: { page: 1 } },
    );
    await waitFor(() => expect(result.current.data).toEqual(first));
    rerender({ page: 2 });
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));
    expect(result.current.data).toEqual(first);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);
    await act(async () => resolveNext(second));
    await waitFor(() => expect(result.current.data).toEqual(second));
    expect(result.current.isPlaceholderData).toBe(false);
    act(() => {
      void result.current.refetch();
    });
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(second);
    await act(async () => resolveNext(second));
    unmount();
    client.clear();
  },
);
