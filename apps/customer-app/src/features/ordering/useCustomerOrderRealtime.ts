import { useEffect, useRef, useState } from "react";
import type { CustomerOrder } from "@/api";

import {
  CUSTOMER_ORDER_INITIAL_RECONNECT_DELAY_MS,
  CUSTOMER_ORDER_MAX_RECONNECT_DELAY_MS,
} from "./constants";

export const useCustomerOrderRealtime = (
  sessionToken: string | undefined,
  orderId: string | undefined,
  onOrder: (order: CustomerOrder) => void,
  onMenuAvailability?: (() => void) | undefined,
) => {
  const [live, setLive] = useState(false);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const pingTimer = useRef<number | undefined>(undefined);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    if (!sessionToken) {
      setLive(false);
      return;
    }

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const configured = import.meta.env.VITE_WS_URL as string | undefined;
    const wsBase = (
      configured ?? `${proto}://${window.location.host}/ws/events`
    ).replace(/\/events$/, "");
    let stopped = false;
    let socket: WebSocket | undefined;

    const clearTimers = () => {
      if (pingTimer.current !== undefined) {
        window.clearInterval(pingTimer.current);
        pingTimer.current = undefined;
      }
      if (reconnectTimer.current !== undefined) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = undefined;
      }
    };

    const scheduleReconnect = () => {
      if (stopped || reconnectTimer.current !== undefined) return;
      const delay = Math.min(
        CUSTOMER_ORDER_INITIAL_RECONNECT_DELAY_MS *
          2 ** reconnectAttempt.current,
        CUSTOMER_ORDER_MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttempt.current += 1;
      reconnectTimer.current = window.setTimeout(() => {
        reconnectTimer.current = undefined;
        connect();
      }, delay);
    };

    const connect = () => {
      if (stopped) return;
      clearTimers();
      socket = new WebSocket(`${wsBase}/customer/events`);

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", session: sessionToken }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type?: string;
            payload?: CustomerOrder & { id?: string };
          };
          if (message.type === "connected") {
            reconnectAttempt.current = 0;
            setLive(true);
            if (pingTimer.current !== undefined) {
              window.clearInterval(pingTimer.current);
            }
            pingTimer.current = window.setInterval(() => {
              if (socket?.readyState === WebSocket.OPEN) socket.send("ping");
            }, 25_000);
          } else if (
            message.type === "order.updated" &&
            orderId &&
            message.payload?.id === orderId
          ) {
            onOrder(message.payload);
          } else if (message.type === "menu.availability.updated") {
            onMenuAvailability?.();
          }
        } catch {}
      };

      socket.onerror = () => {
        setLive(false);
      };

      socket.onclose = () => {
        setLive(false);
        if (pingTimer.current !== undefined) {
          window.clearInterval(pingTimer.current);
          pingTimer.current = undefined;
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimers();
      socket?.close();
      setLive(false);
    };
  }, [sessionToken, orderId, onOrder, onMenuAvailability]);

  return live;
};
