// Bounded fallback for a single process. Multi-instance deployments should
// enforce a shared submission budget at their trusted ingress as well.
export const createLeadLimiter = (
  windowMs: number,
  maxRequests: number,
  maxKeys: number,
  now: () => number = Date.now,
) => {
  const clients = new Map<string, number[]>();
  let nextSweep = 0;
  return {
    get size() {
      return clients.size;
    },
    isRateLimited(key: string): boolean {
      const time = now();
      if (time >= nextSweep || clients.size >= maxKeys) {
        for (const [client, timestamps] of clients) {
          if (time - timestamps[timestamps.length - 1]! >= windowMs)
            clients.delete(client);
        }
        nextSweep = time + Math.min(windowMs, 60_000);
      }
      const recent = (clients.get(key) ?? []).filter(
        (timestamp) => time - timestamp < windowMs,
      );
      // Keep existing clients' budgets intact when capacity is exhausted.
      if (!clients.has(key) && clients.size >= maxKeys) return true;
      if (recent.length >= maxRequests) return true;
      recent.push(time);
      clients.set(key, recent);
      return false;
    },
  };
};
