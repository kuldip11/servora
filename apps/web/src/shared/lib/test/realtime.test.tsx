import { act, createElement } from "react";
import type { RealtimeClientConfig } from "@pos/realtime";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const realtime = vi.hoisted(() => ({
  createRealtimeClient: vi.fn((_config: RealtimeClientConfig) => ({
    reconnect: vi.fn(),
  })),
  isRealtimeEnvelope: vi.fn(() => true),
  useRealtime: vi.fn(),
  useRealtimeEvent: vi.fn(),
  useRealtimeConnection: vi.fn(() => true),
}));

vi.mock("@pos/realtime", () => realtime);

const authState = vi.hoisted(() => ({
  accessToken: "access-1" as string | null,
  franchiseId: "tenant-1" as string | null,
  branchId: "branch-1" as string | null,
}));

vi.mock("../../../store/auth", () => ({
  useAuthStore: Object.assign(
    vi.fn((selector: (state: typeof authState) => unknown) =>
      selector(authState),
    ),
    { getState: () => authState },
  ),
}));

import {
  useRealtime,
  useRealtimeConnection,
  useRealtimeEvent,
} from "@/shared/lib/realtime";

function renderHook<T>(hook: () => T) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let value!: T;
  function Probe() {
    value = hook();
    return null;
  }
  const root = createRoot(container);
  act(() => root.render(createElement(Probe)));
  return {
    get result() {
      return value;
    },
    rerender: () => act(() => root.render(createElement(Probe))),
    unmount: () => act(() => root.unmount()),
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
  realtime.useRealtime.mockClear();
  realtime.useRealtimeEvent.mockClear();
  realtime.useRealtimeConnection.mockClear();
  authState.accessToken = "access-1";
  authState.franchiseId = "tenant-1";
  authState.branchId = "branch-1";
});

describe("web realtime adapter", () => {
  it("creates one client using the current auth context", () => {
    expect(realtime.createRealtimeClient).toHaveBeenCalledWith(
      expect.objectContaining({
        getAccessToken: expect.any(Function),
        getTenantId: expect.any(Function),
        getBranchId: expect.any(Function),
      }),
    );
    const config = realtime.createRealtimeClient.mock.calls[0]?.[0];
    expect(config).toBeDefined();
    expect(config?.getAccessToken()).toBe("access-1");
    expect(config?.getTenantId?.()).toBe("tenant-1");
    expect(config?.getBranchId?.()).toBe("branch-1");
  });

  it("delegates the general and typed event hooks and reconnects on context changes", () => {
    const handler = vi.fn();
    const general = renderHook(() => useRealtime(handler));
    const typed = renderHook(() =>
      useRealtimeEvent("order.updated" as any, handler),
    );

    expect(realtime.useRealtime).toHaveBeenCalledWith(
      expect.anything(),
      handler,
    );
    expect(realtime.useRealtimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      "order.updated",
      handler,
    );

    authState.branchId = "branch-2";
    general.rerender();
    typed.rerender();
    const client = realtime.createRealtimeClient.mock.results[0]?.value as {
      reconnect: ReturnType<typeof vi.fn>;
    };
    expect(client.reconnect).toHaveBeenCalled();

    general.unmount();
    typed.unmount();
  });

  it("returns the shared connection state", () => {
    const hook = renderHook(() => useRealtimeConnection());
    expect(hook.result).toBe(true);
    expect(realtime.useRealtimeConnection).toHaveBeenCalledWith(
      expect.anything(),
    );
    hook.unmount();
  });
});
