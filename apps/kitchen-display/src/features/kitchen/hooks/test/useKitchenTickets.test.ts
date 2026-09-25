import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  fetchKitchenTickets: vi.fn(),
  fetchKitchenStations: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("../../../../shared/lib/query-scope", () => ({
  getKitchenQueryScope: () => ["tenant-1", "branch-1"],
}));
vi.mock("../../api/tickets", () => ({
  fetchKitchenTickets: mocks.fetchKitchenTickets,
  fetchKitchenStations: mocks.fetchKitchenStations,
}));

import {
  useKitchenStations,
  useKitchenTickets,
} from "@/features/kitchen/hooks/useKitchenTickets";
import { TICKETS_POLL_INTERVAL_MS } from "@/features/kitchen/constants";
import { kitchenKeys } from "@/features/kitchen/query/kitchen.keys";

const scope = ["tenant-1", "branch-1"] as const;

describe("useKitchenTickets", () => {
  it("configures ticket query and executes its fetcher", async () => {
    mocks.useQuery.mockReturnValue({});
    expect(useKitchenTickets()).toEqual({});
    const options = mocks.useQuery.mock.calls[0][0];
    expect(options.queryKey).toEqual(kitchenKeys.ticketList(scope));
    expect(options.refetchInterval).toBe(TICKETS_POLL_INTERVAL_MS);
    mocks.fetchKitchenTickets.mockResolvedValue([]);
    const signal = new AbortController().signal;
    await options.queryFn({ signal });
    expect(mocks.fetchKitchenTickets).toHaveBeenCalledWith(undefined, signal);

    useKitchenTickets("grill");
    const stationOptions = mocks.useQuery.mock.calls.at(-1)?.[0];
    expect(stationOptions.queryKey).toEqual(
      kitchenKeys.ticketList(scope, "grill"),
    );
    await stationOptions.queryFn({ signal });
    expect(mocks.fetchKitchenTickets).toHaveBeenCalledWith("grill", signal);
  });

  it("configures and executes the stations query", async () => {
    mocks.useQuery.mockReturnValue({});
    mocks.fetchKitchenStations.mockResolvedValue([]);
    useKitchenStations();
    const options = mocks.useQuery.mock.calls.at(-1)?.[0];
    const signal = new AbortController().signal;
    await options.queryFn({ signal });
    expect(options.queryKey).toEqual(kitchenKeys.stations(scope));
    expect(mocks.fetchKitchenStations).toHaveBeenCalledWith(signal);
  });
});
