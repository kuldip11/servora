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

export const resolveRealtimeUrl = (
  protocol: string,
  host: string,
  configuredUrl?: string,
): string =>
  configuredUrl ??
  `${protocol === "https:" ? "wss" : "ws"}://${host}/ws/events`;

const wsUrl = resolveRealtimeUrl(
  window.location.protocol,
  window.location.host,
  import.meta.env["VITE_WS_URL"],
);

const client = createRealtimeClient<RealtimeEnvelope>({
  url: wsUrl,
  getAccessToken: getToken,
  getTenantId: () => sessionStorage.getItem(STORAGE_KEYS.tenant),
  getBranchId: () => sessionStorage.getItem(STORAGE_KEYS.branch),
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
