import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  regenerate: vi.fn(),
  setQueryData: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/features/tables/services/tables.service", () => ({
  tablesService: { regenerateTakeawayQr: mocks.regenerate },
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { setQueryData: mocks.setQueryData },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: mocks.notifySuccess,
  notifyError: mocks.notifyError,
}));
vi.mock("@/shared/lib/query-context", () => ({
  branchQueryContextKey: () => ["branch-context", "fr-1", "br-1"],
}));

let mutationOptions: {
  mutationFn: () => unknown;
  onSuccess: (data: unknown) => void;
  onError: (error: unknown) => void;
};
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
  useMutation: (options: typeof mutationOptions) => {
    mutationOptions = options;
    return options;
  },
}));

import { useRegenerateTakeawayQr } from "../useRegenerateTakeawayQr";

describe("useRegenerateTakeawayQr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regenerates and writes the branch-scoped QR cache", async () => {
    const data = { branchId: "br-1", token: "next" };
    mocks.regenerate.mockResolvedValue(data);
    useRegenerateTakeawayQr("br-1");
    await mutationOptions.mutationFn();
    expect(mocks.regenerate).toHaveBeenCalledWith("br-1");
    mutationOptions.onSuccess(data);
    expect(mocks.setQueryData).toHaveBeenCalledWith(
      ["tables", "branch-context", "fr-1", "br-1", "takeaway-qr", "br-1"],
      data,
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      "Takeaway QR code regenerated",
    );
  });

  it("rejects aggregate context and reports mutation errors", async () => {
    useRegenerateTakeawayQr("all");
    await expect(
      Promise.resolve().then(() => mutationOptions.mutationFn()),
    ).rejects.toThrow("A branch is required to regenerate the takeaway QR");
    const error = new Error("regen failed");
    mutationOptions.onError(error);
    expect(mocks.notifyError).toHaveBeenCalledWith(
      error,
      "Unable to regenerate takeaway QR",
    );
  });
});
