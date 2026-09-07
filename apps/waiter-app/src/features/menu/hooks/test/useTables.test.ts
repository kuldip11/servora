import { beforeEach, describe, expect, it, vi } from "vitest";

const { configs, fetchTables } = vi.hoisted(() => ({
  configs: [] as any[],
  fetchTables: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (config: any) => {
    configs.push(config);
    return config;
  },
}));
vi.mock("@/features/menu/api/tables", () => ({ fetchTables }));
import { useTables } from "../useTables";

beforeEach(() => {
  configs.length = 0;
  vi.clearAllMocks();
});

describe("useTables", () => {
  it("supports disabled and polling query states", async () => {
    useTables(false);
    expect(configs.at(-1).enabled).toBe(false);
    await configs.at(-1).queryFn();

    useTables(true);
    expect(configs.at(-1).refetchInterval).toBe(20000);
    expect(fetchTables).toHaveBeenCalled();
  });
});
