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
  saveContext: mocks.saveContext,
  clearTokens: mocks.clearTokens,
}));

import { useLogin } from "../useLogin";

const tenantMembership = {
  membershipId: "m-tenant",
  tenant: { id: "tenant-1", name: "Tenant" },
  roles: [{ name: "Owner", scope: "TENANT" }],
  branches: [],
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
  branches: [],
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
    mocks.mutationOptions?.onError(new Error("Denied"));
    expect(mocks.clearTokens).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Denied",
      tone: "danger",
    });
  });

  it("activates a sole tenant-scoped membership without a branch", async () => {
    const onLogin = vi.fn();
    prepareStates("credentials", [], [], null);
    mocks.login.mockResolvedValue({ accessToken: "token" });
    mocks.fetchMemberships.mockResolvedValue([tenantMembership]);
    useLogin(onLogin);
    await mocks.mutationOptions?.mutationFn({
      email: "a@b.com",
      password: "pw",
    });
    expect(mocks.saveContext).toHaveBeenCalledWith("tenant-1", null);
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
    expect(mocks.saveContext).toHaveBeenCalledWith("tenant-2", "branch-1");
    expect(onLogin).toHaveBeenCalledOnce();
  });

  it("moves a branch-scoped membership without a default branch to branch selection", async () => {
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
    expect(mocks.setters[2]).toHaveBeenCalledWith([]);
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

    mocks.saveContext.mockImplementationOnce(() => {
      throw new Error("context failed");
    });
    result.selectMembership("m-tenant");
    await Promise.resolve();
    await Promise.resolve();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "context failed",
      tone: "danger",
    });
  });

  it("selects a branch only with an active membership and resets credentials", () => {
    const onLogin = vi.fn();
    prepareStates("branch", [], [], null);
    const withoutActive = useLogin(onLogin);
    withoutActive.selectBranchForMembership("branch-1");
    expect(onLogin).not.toHaveBeenCalled();

    prepareStates("branch", [], [], branchMembership);
    const active = useLogin(onLogin);
    active.selectBranchForMembership("branch-2");
    expect(mocks.saveContext).toHaveBeenCalledWith("tenant-2", "branch-2");
    expect(onLogin).toHaveBeenCalledOnce();
    active.resetToCredentials();
    expect(mocks.setters.at(-4)).toHaveBeenCalledWith("credentials");
    expect(mocks.setters.at(-2)).toHaveBeenCalledWith([]);
    expect(mocks.clearTokens).toHaveBeenCalled();
  });
});
