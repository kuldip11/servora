import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRealtimeClient } from "../create-realtime-client";

type TestEvent = { type: "order.created" | "ping"; id?: string };

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  });

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  message(data: unknown) {
    this.onmessage?.({
      data: typeof data === "string" ? data : JSON.stringify(data),
    });
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.useRealTimers();
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

describe("createRealtimeClient", () => {
  it("lazily connects once, shares one socket, and dispatches events to subscribers", () => {
    let token = "token-1";
    const client = createRealtimeClient<TestEvent>({
      url: "wss://realtime.example.com/socket",
      getAccessToken: () => token,
      getTenantId: () => "tenant-1",
      getBranchId: () => "branch-1",
    });
    const first = vi.fn();
    const second = vi.fn();

    expect(FakeWebSocket.instances).toHaveLength(0);
    const unsubscribeFirst = client.subscribe(first);
    const unsubscribeSecond = client.subscribe(second);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0]!.url).toBe(
      "wss://realtime.example.com/socket",
    );

    FakeWebSocket.instances[0]!.open();
    expect(FakeWebSocket.instances[0]!.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "auth",
        token: "token-1",
        tenantId: "tenant-1",
        branchId: "branch-1",
      }),
    );
    expect(client.isConnected()).toBe(false);
    FakeWebSocket.instances[0]!.message({ type: "connected" });
    expect(client.isConnected()).toBe(true);
    FakeWebSocket.instances[0]!.message({ type: "order.created", id: "42" });
    expect(first).toHaveBeenCalledWith({ type: "order.created", id: "42" });
    expect(second).toHaveBeenCalledWith({ type: "order.created", id: "42" });

    unsubscribeFirst();
    unsubscribeSecond();
    expect(FakeWebSocket.instances[0]!.close).toHaveBeenCalledOnce();
    token = "token-2";
  });

  it("ignores malformed messages", () => {
    const handler = vi.fn();
    const client = createRealtimeClient<TestEvent>({
      url: "wss://example.com",
      getAccessToken: () => "token",
    });
    client.subscribe(handler);
    FakeWebSocket.instances[0]!.message("{not-json");
    expect(handler).not.toHaveBeenCalled();
  });

  it("notifies connection listeners only when the connection state changes", () => {
    const listener = vi.fn();
    const client = createRealtimeClient<TestEvent>({
      url: "wss://example.com",
      getAccessToken: () => "token",
    });
    const unsubscribe = client.onConnectionChange(listener);
    client.subscribe(() => {});
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    ws.message({ type: "connected" });
    ws.open();
    ws.message({ type: "connected" });
    ws.close();
    expect(listener.mock.calls).toEqual([[true], [false]]);
    unsubscribe();
    ws.open();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("reconnects after close while subscribers remain and reads the current token", () => {
    vi.useFakeTimers();
    let token = "old-token";
    const client = createRealtimeClient<TestEvent>({
      url: "wss://example.com",
      getAccessToken: () => token,
      reconnectDelayMs: 100,
    });
    client.subscribe(() => {});
    const first = FakeWebSocket.instances[0]!;
    first.open();
    first.message({ type: "connected" });
    first.close();
    token = "new-token";
    vi.advanceTimersByTime(99);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1]!.url).toBe("wss://example.com");
    FakeWebSocket.instances[1]!.open();
    expect(FakeWebSocket.instances[1]!.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "auth",
        token: "new-token",
        tenantId: null,
        branchId: null,
      }),
    );
  });

  it("does not reconnect when all subscribers have unsubscribed or when no token exists", () => {
    vi.useFakeTimers();
    let token: string | null = "token";
    const client = createRealtimeClient<TestEvent>({
      url: "wss://example.com",
      getAccessToken: () => token,
      reconnectDelayMs: 50,
    });
    const unsubscribe = client.subscribe(() => {});
    FakeWebSocket.instances[0]!.close();
    unsubscribe();
    vi.advanceTimersByTime(50);
    expect(FakeWebSocket.instances).toHaveLength(1);

    const secondClient = createRealtimeClient<TestEvent>({
      url: "wss://other.example.com",
      getAccessToken: () => token,
      reconnectDelayMs: 50,
    });
    secondClient.subscribe(() => {});
    const second = FakeWebSocket.instances[1]!;
    token = null;
    second.close();
    vi.advanceTimersByTime(50);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("reconnect() closes an active socket or connects when idle", () => {
    const token = { value: "token" };
    const client = createRealtimeClient<TestEvent>({
      url: "wss://example.com",
      getAccessToken: () => token.value,
    });
    client.subscribe(() => {});
    const first = FakeWebSocket.instances[0]!;
    client.reconnect();
    expect(first.close).toHaveBeenCalledOnce();

    const idle = createRealtimeClient<TestEvent>({
      url: "wss://idle.example.com",
      getAccessToken: () => token.value,
    });
    idle.reconnect();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
  it("closes on socket errors and replaces an existing reconnect timer", () => {
    vi.useFakeTimers();
    const client = createRealtimeClient<TestEvent>({
      url: "wss://example.com",
      getAccessToken: () => "token",
      reconnectDelayMs: 25,
    });
    client.subscribe(() => {});
    const ws = FakeWebSocket.instances[0]!;

    ws.onerror?.();
    expect(ws.close).toHaveBeenCalledOnce();
    expect(FakeWebSocket.instances).toHaveLength(1);

    ws.onclose?.();
    vi.advanceTimersByTime(24);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
