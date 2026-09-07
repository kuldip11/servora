import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  listAll: vi.fn(),
}));

vi.mock("@/features/orders/services/cancellation-reasons.service", () => ({
  cancellationReasonsService: {
    list: mocks.list,
    listAll: mocks.listAll,
  },
}));

import {
  cancellationReasonKeys,
  useCancellationReasons,
} from "../useCancellationReasons";

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useCancellationReasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([]);
    mocks.listAll.mockResolvedValue([]);
  });

  it("exposes stable cancellation reason query keys", () => {
    expect(cancellationReasonKeys.active).toEqual([
      "cancellation-reasons",
      "active",
    ]);
    expect(cancellationReasonKeys.all).toEqual(["cancellation-reasons"]);
  });

  it("loads active reasons when onlyActive is true", async () => {
    const hook = renderHook(() => useCancellationReasons(true, true), {
      wrapper,
    });

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(mocks.list).toHaveBeenCalledWith(true);
    expect(mocks.listAll).not.toHaveBeenCalled();
  });

  it("loads all reasons when onlyActive is false", async () => {
    const hook = renderHook(() => useCancellationReasons(false, true), {
      wrapper,
    });

    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(mocks.listAll).toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("stays idle when disabled", () => {
    const hook = renderHook(() => useCancellationReasons(true, false), {
      wrapper,
    });

    expect(hook.result.current.fetchStatus).toBe("idle");
  });
});
