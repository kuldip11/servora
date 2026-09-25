export const queryFreshness = {
  nearLive: 15_000,
  operational: 30_000,
  transactional: 60_000,
  normal: 120_000,
  semiStatic: 300_000,
  reference: 600_000,
} as const;

export const queryPolling = {
  dashboard: 30_000,
  operations: 60_000,
} as const;

export const queryGarbageCollection = {
  normal: 900_000,
} as const;
