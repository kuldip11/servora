import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeFranchiseId: vi.fn(),
  listTenants: vi.fn(),
}));

vi.mock("@/shared/lib/query-context", () => ({
  activeFranchiseId: mocks.activeFranchiseId,
}));
vi.mock("@pos/api-client", () => ({
  createAuthApi: () => ({ listTenants: mocks.listTenants }),
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));

import { useCourseSequencingEnabled } from "../useCourseSequencingEnabled";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useCourseSequencingEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeFranchiseId.mockReturnValue("t1");
    mocks.listTenants.mockResolvedValue([]);
  });

  it("returns true when the active tenant has course sequencing enabled", async () => {
    mocks.listTenants.mockResolvedValue([
      { tenant: { id: "t1", courseSequencingEnabled: true } },
    ]);

    const hook = renderHook(() => useCourseSequencingEnabled(), { wrapper });
    await waitFor(() => expect(hook.result.current).toBe(true));
  });

  it("returns false when the active tenant has course sequencing disabled", async () => {
    mocks.listTenants.mockResolvedValue([
      { tenant: { id: "t1", courseSequencingEnabled: false } },
    ]);

    const hook = renderHook(() => useCourseSequencingEnabled(), { wrapper });
    await waitFor(() => expect(mocks.listTenants).toHaveBeenCalled());
    expect(hook.result.current).toBe(false);
  });

  it("returns false when the active tenant is missing", async () => {
    mocks.listTenants.mockResolvedValue([
      { tenant: { id: "other", courseSequencingEnabled: true } },
    ]);

    const hook = renderHook(() => useCourseSequencingEnabled(), { wrapper });
    await waitFor(() => expect(mocks.listTenants).toHaveBeenCalled());
    expect(hook.result.current).toBe(false);
  });

  it("does not query when there is no active tenant", () => {
    mocks.activeFranchiseId.mockReturnValue(null);

    const hook = renderHook(() => useCourseSequencingEnabled(), { wrapper });
    expect(hook.result.current).toBe(false);
    expect(mocks.listTenants).not.toHaveBeenCalled();
  });
});
