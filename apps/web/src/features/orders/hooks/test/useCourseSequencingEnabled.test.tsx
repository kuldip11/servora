import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeFranchiseId: vi.fn(),
  useTenantSettings: vi.fn(),
}));

vi.mock("@/shared/lib/query-context", () => ({
  activeFranchiseId: mocks.activeFranchiseId,
}));
vi.mock("@/features/settings/hooks/useTenantSettings", () => ({
  useTenantSettings: mocks.useTenantSettings,
}));

import { useCourseSequencingEnabled } from "../useCourseSequencingEnabled";

describe("useCourseSequencingEnabled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeFranchiseId.mockReturnValue("t1");
    mocks.useTenantSettings.mockReturnValue({ data: undefined });
  });

  it("returns true when tenant settings enable course sequencing", () => {
    mocks.useTenantSettings.mockReturnValue({
      data: { courseSequencingEnabled: true },
    });
    const hook = renderHook(() => useCourseSequencingEnabled());
    expect(hook.result.current).toBe(true);
    expect(mocks.useTenantSettings).toHaveBeenCalledWith("t1", true);
  });

  it("returns false when tenant settings disable course sequencing", () => {
    mocks.useTenantSettings.mockReturnValue({
      data: { courseSequencingEnabled: false },
    });
    const hook = renderHook(() => useCourseSequencingEnabled());
    expect(hook.result.current).toBe(false);
  });

  it("returns false while tenant settings are unavailable", () => {
    const hook = renderHook(() => useCourseSequencingEnabled());
    expect(hook.result.current).toBe(false);
  });

  it("disables the shared settings query when there is no active tenant", () => {
    mocks.activeFranchiseId.mockReturnValue(null);
    const hook = renderHook(() => useCourseSequencingEnabled());
    expect(hook.result.current).toBe(false);
    expect(mocks.useTenantSettings).toHaveBeenCalledWith("", false);
  });
});
