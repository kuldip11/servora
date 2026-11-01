import { useEffect } from "react";
import {
  createRealtimeClient,
  isRealtimeEnvelope,
  type RealtimeEnvelope,
  useRealtime as useRealtimeBase,
  useRealtimeEvent as useRealtimeEventBase,
  useRealtimeConnection as useRealtimeConnectionBase,
} from "@pos/realtime";
import { useAuthStore } from "@/store/auth";

const wsUrl =
  import.meta.env["VITE_WS_URL"] ?? `ws://${window.location.host}/ws/events`;

const client = createRealtimeClient<RealtimeEnvelope>({
  url: wsUrl,
  getAccessToken: () => useAuthStore.getState().accessToken,
  getTenantId: () => useAuthStore.getState().franchiseId,
  getBranchId: () => useAuthStore.getState().branchId,
  validateEvent: isRealtimeEnvelope,
});

const useRealtimeContextSync = () => {
  const franchiseId = useAuthStore((state) => state.franchiseId);
  const branchId = useAuthStore((state) => state.branchId);

  useEffect(() => {
    if (useAuthStore.getState().accessToken) client.reconnect();
  }, [franchiseId, branchId]);
};

export function useRealtime(handler: (event: RealtimeEnvelope) => void) {
  useRealtimeContextSync();
  useRealtimeBase(client, handler);
}

export function useRealtimeEvent<T extends RealtimeEnvelope["type"]>(
  type: T,
  handler: (event: Extract<RealtimeEnvelope, { type: T }>) => void,
) {
  useRealtimeContextSync();
  useRealtimeEventBase(client, type, handler);
}

export function useRealtimeConnection() {
  useRealtimeContextSync();
  return useRealtimeConnectionBase(client);
}
