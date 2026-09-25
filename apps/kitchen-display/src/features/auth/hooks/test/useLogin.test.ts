import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stateValues: [] as unknown[],
  setters: [] as ReturnType<typeof vi.fn>[],
  mutationOptions: undefined as
    | {
        mutationFn: (value: {
          email: string;
          password: string;
        }) => Promise<void>;
        onError: (error: unknown) => void;
      }
    | undefined,
  pending: false,
  login: vi.fn(),
  fetchMemberships: vi.fn(),
  saveTokens: vi.fn(),
  saveContext: vi.fn(),
  clearTokens: vi.fn(),
  cancelQueries: vi.fn(() => Promise.resolve()),
  clearQueries: vi.fn(),
  replaceKitchenContext: vi.fn(() => Promise.resolve()),
  clearKitchenQueries: vi.fn(() => Promise.resolve()),
  toast: vi.fn(),
  extractApiError: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : "error",
  ),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: (initial: unknown) => {
      const value = mocks.stateValues.length
        ? mocks.stateValues.shift()
        : typeof initial === "function"
          ? (initial as () => unknown)()
          : initial;
      const setter = vi.fn();
      mocks.setters.push(setter);
      return [value, setter];
    },
  };
});

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    cancelQueries: mocks.cancelQueries,
    clear: mocks.clearQueries,
  }),
  useMutation: (options: typeof mocks.mutationOptions) => {
    mocks.mutationOptions = options;
    return { mutate: vi.fn(), isPending: mocks.pending };
  },
}));
vi.mock("@pos/ui", () => ({ toast: mocks.toast }));
vi.mock("@pos/api-client", () => ({ extractApiError: mocks.extractApiError }));
vi.mock("@/features/auth/api/login", () => ({
  login: mocks.login,
  fetchMemberships: mocks.fetchMemberships,
}));
vi.mock("@/features/auth/storage", () => ({
  saveTokens: mocks.saveTokens,
  clearTokens: mocks.clearTokens,
}));
vi.mock("@/shared/lib/query-lifecycle", () => ({
  replaceKitchenContext: mocks.replaceKitchenContext,
  clearKitchenQueries: mocks.clearKitchenQueries,
}));

import { useLogin } from "../useLogin";

const tenantMembership = {
  membershipId: "m-tenant",
  tenant: { id: "tenant-1", name: "Tenant" },
  roles: [{ name: "Owner", scope: "TENANT" }],
  branches: [{ id: "branch-owner", name: "Owner Branch" }],
} as never;
const branchMembership = {
  membershipId: "m-branch",
  tenant: { id: "tenant-2", name: "Tenant 2" },
  roles: [{ name: "Chef", scope: "BRANCH" }],
  branches: [{ id: "branch-1", name: "Main" }],
} as never;
const branchChoiceMembership = {
  membershipId: "m-choice",
  tenant: { id: "tenant-3", name: "Tenant 3" },
  roles: [{ name: "Chef", scope: "BRANCH" }],
  branches: [
    { id: "branch-1", name: "Main" },
    { id: "branch-2", name: "Second" },
  ],
} as never;

const prepareStates = (...values: unknown[]) => {
  mocks.stateValues = [...values];
  mocks.setters.length = 0;
};

describe("useLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutationOptions = undefined;
    mocks.pending = false;
    prepareStates();
  });

  it("handles no-membership errors and exposes mutation pending state", async () => {
    mocks.pending = true;
    prepareStates("credentials", [], [], null);
    mocks.login.mockResolvedValue({ accessToken: "token" });
    mocks.fetchMemberships.mockResolvedValue([]);
    const result = useLogin(vi.fn());
    expect(result.isLoading).toBe(true);
    await expect(
      mocks.mutationOptions?.mutationFn({ email: "a@b.com", password: "pw" }),
    ).rejects.toThrow("No business membership");
    expect(mocks.saveTokens).toHaveBeenCalledWith("token");
    await mocks.mutationOptions?.onError(new Error("Denied"));
    expect(mocks.clearTokens).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Denied",
      tone: "danger",
    });
  });

  it("activates a sole tenant-scoped membership with its kitchen branch", async () => {
    const onLogin = vi.fn();
    prepareStates("credentials", [], [], null);
    mocks.login.mockResolvedValue({ accessToken: "token" });
    mocks.fetchMemberships.mockResolvedValue([tenantMembership]);
    useLogin(onLogin);
    await mocks.mutationOptions?.mutationFn({
      email: "a@b.com",
      password: "pw",
    });
    expect(mocks.replaceKitchenContext).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-1",
      "branch-owner",
    );
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it("activates the first branch for a sole branch membership", async () => {
    const onLogin = vi.fn();
    prepareStates("credentials", [], [], null);
    mocks.login.mockResolvedValue({ accessToken: "token" });
    mocks.fetchMemberships.mockResolvedValue([branchMembership]);
    useLogin(onLogin);
    await mocks.mutationOptions?.mutationFn({
      email: "a@b.com",
      password: "pw",
    });
    expect(mocks.replaceKitchenContext).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-2",
      "branch-1",
    );
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it("moves a membership with multiple active branches to branch selection", async () => {
    const onLogin = vi.fn();
    prepareStates("credentials", [], [], null);
    mocks.login.mockResolvedValue({ accessToken: "token" });
    mocks.fetchMemberships.mockResolvedValue([branchChoiceMembership]);
    useLogin(onLogin);
    await mocks.mutationOptions?.mutationFn({
      email: "a@b.com",
      password: "pw",
    });
    expect(onLogin).not.toHaveBeenCalled();
    expect(mocks.replaceKitchenContext).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-3",
      null,
    );
    expect(mocks.setters[2]).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "branch-1" }),
        expect.objectContaining({ id: "branch-2" }),
      ]),
    );
    expect(mocks.setters[0]).toHaveBeenCalledWith("branch");
  });

  it("moves multiple memberships to membership selection", async () => {
    prepareStates("credentials", [], [], null);
    mocks.login.mockResolvedValue({ accessToken: "token" });
    mocks.fetchMemberships.mockResolvedValue([
      tenantMembership,
      branchMembership,
    ]);
    useLogin(vi.fn());
    await mocks.mutationOptions?.mutationFn({
      email: "a@b.com",
      password: "pw",
    });
    expect(mocks.setters[1]).toHaveBeenCalledWith([
      tenantMembership,
      branchMembership,
    ]);
    expect(mocks.setters[0]).toHaveBeenCalledWith("membership");
  });

  it("selects memberships, handles activation failures, and ignores unknown ids", async () => {
    const onLogin = vi.fn();
    prepareStates("membership", [tenantMembership], [], null);
    const result = useLogin(onLogin);
    result.selectMembership("missing");
    expect(onLogin).not.toHaveBeenCalled();

    mocks.replaceKitchenContext.mockRejectedValueOnce(
      new Error("context failed"),
    );
    result.selectMembership("m-tenant");
    await vi.waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: "context failed",
        tone: "danger",
      }),
    );
  });

  it("selects a branch only with an active membership and resets credentials", async () => {
    const onLogin = vi.fn();
    prepareStates("branch", [], [], null);
    const withoutActive = useLogin(onLogin);
    withoutActive.selectBranchForMembership("branch-1");
    expect(onLogin).not.toHaveBeenCalled();

    prepareStates("branch", [], [], branchMembership);
    const active = useLogin(onLogin);
    active.selectBranchForMembership("branch-2");
    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledOnce());
    expect(mocks.replaceKitchenContext).toHaveBeenCalledWith(
      expect.anything(),
      "tenant-2",
      "branch-2",
    );
    active.resetToCredentials();
    expect(mocks.setters.at(-4)).toHaveBeenCalledWith("credentials");
    expect(mocks.setters.at(-2)).toHaveBeenCalledWith([]);
    await vi.waitFor(() => {
      expect(mocks.clearKitchenQueries).toHaveBeenCalled();
      expect(mocks.clearTokens).toHaveBeenCalled();
    });
  });
});
