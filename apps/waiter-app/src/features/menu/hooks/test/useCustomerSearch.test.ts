import { beforeEach, describe, expect, it, vi } from "vitest";

const { configs, searchCustomers } = vi.hoisted(() => ({
  configs: [] as any[],
  searchCustomers: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (config: any) => {
    configs.push(config);
    return config;
  },
}));
vi.mock("@/features/menu/api/customers", () => ({ searchCustomers }));

import { useCustomerSearch } from "../useCustomerSearch";

beforeEach(() => {
  configs.length = 0;
  vi.clearAllMocks();
});

describe("useCustomerSearch", () => {
  it("disables short searches and enables valid searches", async () => {
    useCustomerSearch("a");
    expect(configs.at(-1).enabled).toBe(false);
    await configs.at(-1).queryFn();

    useCustomerSearch("ab");
    expect(configs.at(-1).enabled).toBe(true);
    await configs.at(-1).queryFn();
    expect(searchCustomers).toHaveBeenCalled();
  });
});
