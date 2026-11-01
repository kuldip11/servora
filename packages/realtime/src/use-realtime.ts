import { useEffect, useRef, useState } from "react";
import type { RealtimeClient } from "./create-realtime-client";

export function useRealtime<E extends { type: string }>(
  client: RealtimeClient<E>,
  handler: (event: E) => void,
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stableHandler = (event: E) => handlerRef.current(event);
    return client.subscribe(stableHandler);
  }, [client]);
}

export function useRealtimeEvent<
  E extends { type: string },
  T extends E["type"],
>(
  client: RealtimeClient<E>,
  type: T,
  handler: (event: Extract<E, { type: T }>) => void,
): void {
  useRealtime(client, (event) => {
    if (event.type === type) {
      handler(event as Extract<E, { type: T }>);
    }
  });
}

export function useRealtimeConnection<E extends { type: string }>(
  client: RealtimeClient<E>,
): boolean {
  const [connected, setConnected] = useState(client.isConnected());

  useEffect(() => client.onConnectionChange(setConnected), [client]);

  return connected;
}
