export interface RealtimeClientConfig {
  url: string;
  getAccessToken: () => string | null;

  getTenantId?: () => string | null;

  getBranchId?: () => string | null;
  reconnectDelayMs?: number;
  validateEvent?: (value: unknown) => boolean;
}
