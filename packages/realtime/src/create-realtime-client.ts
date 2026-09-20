import type { RealtimeClientConfig } from "./types";

const isTypedMessage = (value: unknown): value is { type: string } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>)["type"] === "string";

export interface RealtimeClient<E extends { type: string }> {
  subscribe(handler: (event: E) => void): () => void;
  isConnected(): boolean;

  onConnectionChange(listener: (connected: boolean) => void): () => void;
  reconnect(): void;
}

export function createRealtimeClient<E extends { type: string }>(
  config: RealtimeClientConfig,
): RealtimeClient<E> {
  const {
    url,
    getAccessToken,
    getTenantId,
    getBranchId,
    reconnectDelayMs = 3000,
  } = config;

  let ws: WebSocket | null = null;
  const handlers = new Set<(event: E) => void>();
  const connectionListeners = new Set<(connected: boolean) => void>();
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let connected = false;

  function setConnected(value: boolean) {
    if (connected === value) return;
    connected = value;
    connectionListeners.forEach((listener) => listener(value));
  }

  function connect(token: string) {
    if (
      ws &&
      (ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING)
    )
      return;

    const tenantId = getTenantId?.() ?? null;
    const branchId = getBranchId?.() ?? null;
    ws = new WebSocket(url);

    ws.onopen = () => {
      ws?.send(
        JSON.stringify({
          type: "auth",
          token,
          tenantId,
          branchId,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isTypedMessage(parsed)) return;
        if (parsed.type === "connected") {
          setConnected(true);
          return;
        }
        handlers.forEach((handler) => handler(parsed as E));
      } catch {
        // Ignore malformed/untrusted realtime frames; the connection remains usable.
      }
    };

    ws.onclose = () => {
      ws = null;
      setConnected(false);

      if (handlers.size === 0) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        const currentToken = getAccessToken();
        if (currentToken && handlers.size > 0) connect(currentToken);
      }, reconnectDelayMs);
    };

    ws.onerror = () => ws?.close();
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    ws?.close();
    ws = null;
    setConnected(false);
  }

  function subscribe(handler: (event: E) => void) {
    handlers.add(handler);

    const token = getAccessToken();
    if (token) connect(token);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) disconnect();
    };
  }

  function reconnect() {
    if (ws) ws.close();
    else {
      const token = getAccessToken();
      if (token) connect(token);
    }
  }

  function onConnectionChange(listener: (connected: boolean) => void) {
    connectionListeners.add(listener);
    return () => connectionListeners.delete(listener);
  }

  return {
    subscribe,
    isConnected: () => connected,
    onConnectionChange,
    reconnect,
  };
}
