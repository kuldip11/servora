import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRealtimeClient: vi.fn(() => ({ connected: true })),
  useRealtimeBase: vi.fn(),
  useRealtimeEventBase: vi.fn(),
  useRealtimeConnection: vi.fn(() => true),
}));

vi.mock("@pos/realtime", () => ({
  createRealtimeClient: mocks.createRealtimeClient,
  isRealtimeEnvelope: vi.fn(() => true),
  useRealtime: mocks.useRealtimeBase,
  useRealtimeEvent: mocks.useRealtimeEventBase,
  useRealtimeConnection: mocks.useRealtimeConnection,
}));

import {
  useRealtime,
  useRealtimeEvent,
  useConnectionStatus,
} from "@/shared/lib/realtime";

describe("realtime", () => {
  it("creates and forwards realtime hooks", () => {
    const handler = vi.fn();
    useRealtime(handler as any);
    useRealtimeEvent("order.updated" as any, handler as any);

    expect(mocks.createRealtimeClient).toHaveBeenCalledTimes(1);
    expect(mocks.useRealtimeBase).toHaveBeenCalled();
    expect(mocks.useRealtimeEventBase).toHaveBeenCalled();
    expect(useConnectionStatus()).toBe(true);
  });
});
