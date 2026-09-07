import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  fetchKitchenTickets: vi.fn(),
  fetchKitchenStations: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("../../api/tickets", () => ({
  fetchKitchenTickets: mocks.fetchKitchenTickets,
  fetchKitchenStations: mocks.fetchKitchenStations,
}));

import {
  useKitchenStations,
  useKitchenTickets,
  KITCHEN_TICKETS_QUERY_KEY,
  kitchenTicketsQueryKey,
} from "@/features/kitchen/hooks/useKitchenTickets";
import { TICKETS_POLL_INTERVAL_MS } from "@/features/kitchen/constants";

describe("useKitchenTickets", () => {
  it("configures ticket query and executes its fetcher", async () => {
    mocks.useQuery.mockReturnValue({});
    expect(useKitchenTickets()).toEqual({});
    const options = mocks.useQuery.mock.calls[0][0];
    expect(options.queryKey).toEqual(KITCHEN_TICKETS_QUERY_KEY);
    expect(options.refetchInterval).toBe(TICKETS_POLL_INTERVAL_MS);
    mocks.fetchKitchenTickets.mockResolvedValue([]);
    await options.queryFn();
    expect(mocks.fetchKitchenTickets).toHaveBeenCalledWith(undefined);

    useKitchenTickets("grill");
    const stationOptions = mocks.useQuery.mock.calls.at(-1)?.[0];
    expect(stationOptions.queryKey).toEqual(kitchenTicketsQueryKey("grill"));
    await stationOptions.queryFn();
    expect(mocks.fetchKitchenTickets).toHaveBeenCalledWith("grill");
  });

  it("configures and executes the stations query", async () => {
    mocks.useQuery.mockReturnValue({});
    mocks.fetchKitchenStations.mockResolvedValue([]);
    useKitchenStations();
    const options = mocks.useQuery.mock.calls.at(-1)?.[0];
    await options.queryFn();
    expect(mocks.fetchKitchenStations).toHaveBeenCalledOnce();
  });
});
