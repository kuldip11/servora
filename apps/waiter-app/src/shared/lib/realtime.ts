import {
  createRealtimeClient,
  isRealtimeEnvelope,
  type RealtimeEnvelope,
  useRealtime as useRealtimeBase,
  useRealtimeEvent as useRealtimeEventBase,
  useRealtimeConnection,
} from "@pos/realtime";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { getToken } from "@/shared/auth/storage";

const proto = window.location.protocol === "https:" ? "wss" : "ws";
const wsUrl =
  import.meta.env["VITE_WS_URL"] ??
  `${proto}://${window.location.host}/ws/events`;

const client = createRealtimeClient<RealtimeEnvelope>({
  url: wsUrl,
  getAccessToken: getToken,
  getTenantId: () => localStorage.getItem(STORAGE_KEYS.tenant),
  getBranchId: () => localStorage.getItem(STORAGE_KEYS.branch),
  validateEvent: isRealtimeEnvelope,
});

export function useRealtime(handler: (event: RealtimeEnvelope) => void) {
  useRealtimeBase(client, handler);
}

export function useRealtimeEvent<T extends RealtimeEnvelope["type"]>(
  type: T,
  handler: (event: Extract<RealtimeEnvelope, { type: T }>) => void,
) {
  useRealtimeEventBase(client, type, handler);
}

export const useConnectionStatus = (): boolean => {
  return useRealtimeConnection(client);
};
