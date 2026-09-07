import { beforeEach, describe, expect, it, vi } from "vitest";

const { configs, fetchCategories } = vi.hoisted(() => ({
  configs: [] as any[],
  fetchCategories: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (config: any) => {
    configs.push(config);
    return config;
  },
}));
vi.mock("@/features/menu/api/menu", () => ({ fetchCategories }));
import { useMenuCategories } from "../useMenuCategories";

beforeEach(() => {
  configs.length = 0;
  vi.clearAllMocks();
});

describe("useMenuCategories", () => {
  it("configures and executes the categories query", async () => {
    useMenuCategories();
    await configs.at(-1).queryFn();
    expect(fetchCategories).toHaveBeenCalled();
  });
});
