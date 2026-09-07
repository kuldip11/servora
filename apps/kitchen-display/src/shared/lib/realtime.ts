import {
  createRealtimeClient,
  useRealtime as useRealtimeBase,
  useRealtimeEvent as useRealtimeEventBase,
  useRealtimeConnection,
} from "@pos/realtime";
import type { RealtimeEvent } from "@pos/types";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { getToken } from "@/features/auth/storage";

export const resolveRealtimeUrl = (
  protocol: string,
  host: string,
  configuredUrl?: string,
): string =>
  configuredUrl ?? `${protocol === "https:" ? "wss" : "ws"}://${host}/ws/events`;

const wsUrl = resolveRealtimeUrl(
  window.location.protocol,
  window.location.host,
  import.meta.env["VITE_WS_URL"],
);

const client = createRealtimeClient<RealtimeEvent>({
  url: wsUrl,
  getAccessToken: getToken,
  getTenantId: () => sessionStorage.getItem(STORAGE_KEYS.tenant),
  getBranchId: () => sessionStorage.getItem(STORAGE_KEYS.branch),
});

export function useRealtime(handler: (event: RealtimeEvent) => void) {
  useRealtimeBase(client, handler);
}

export function useRealtimeEvent<T extends RealtimeEvent["type"]>(
  type: T,
  handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
) {
  useRealtimeEventBase(client, type, handler);
}

export const useConnectionStatus = (): boolean => {
  return useRealtimeConnection(client);
};
