import { beforeEach, describe, expect, it, vi } from "vitest";

const { configs, fetchMyBranch } = vi.hoisted(() => ({
  configs: [] as any[],
  fetchMyBranch: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (config: any) => {
    configs.push(config);
    return config;
  },
}));
vi.mock("@/features/menu/api/branch", () => ({ fetchMyBranch }));
import { useMyBranch } from "../useMyBranch";

beforeEach(() => {
  configs.length = 0;
  vi.clearAllMocks();
});

describe("useMyBranch", () => {
  it("configures and executes the branch query", async () => {
    useMyBranch();
    await configs.at(-1).queryFn();
    expect(fetchMyBranch).toHaveBeenCalled();
  });
});
