import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRealtimeClient: vi.fn<[unknown], { id: string }>(() => ({ id: "client" })),
  useRealtime: vi.fn(),
  useRealtimeEvent: vi.fn(),
  useRealtimeConnection: vi.fn(() => true),
}));

vi.mock("@pos/realtime", () => ({
  createRealtimeClient: mocks.createRealtimeClient,
  useRealtime: mocks.useRealtime,
  useRealtimeEvent: mocks.useRealtimeEvent,
  useRealtimeConnection: mocks.useRealtimeConnection,
}));

import {
  resolveRealtimeUrl,
  useConnectionStatus,
  useRealtime,
  useRealtimeEvent,
} from "@/shared/lib/realtime";

describe("realtime", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.useRealtime.mockClear();
    mocks.useRealtimeEvent.mockClear();
  });

  it("resolves configured and protocol-derived websocket URLs", () => {
    expect(resolveRealtimeUrl("https:", "servora.test")).toBe(
      "wss://servora.test/ws/events",
    );
    expect(resolveRealtimeUrl("http:", "servora.test")).toBe(
      "ws://servora.test/ws/events",
    );
    expect(resolveRealtimeUrl("https:", "ignored", "wss://custom.test/ws")).toBe(
      "wss://custom.test/ws",
    );
  });

  it("creates the client with context getters and exposes all hook wrappers", () => {
    const config = mocks.createRealtimeClient.mock.calls[0]![0] as { getTenantId: () => string | null; getBranchId: () => string | null };
    sessionStorage.setItem("kds_tenant", "tenant-1");
    sessionStorage.setItem("kds_branch", "branch-1");
    expect(config.getTenantId()).toBe("tenant-1");
    expect(config.getBranchId()).toBe("branch-1");

    const handler = vi.fn();
    useRealtime(handler);
    useRealtimeEvent("kitchen.ticket.created", handler as never);
    const client = mocks.createRealtimeClient.mock.results[0]?.value;
    expect(mocks.useRealtime).toHaveBeenCalledWith(client, handler);
    expect(mocks.useRealtimeEvent).toHaveBeenCalledWith(
      client,
      "kitchen.ticket.created",
      handler,
    );
    expect(useConnectionStatus()).toBe(true);
    expect(mocks.useRealtimeConnection).toHaveBeenCalledWith(client);
  });
});
