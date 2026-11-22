import { redis } from "@/lib/redis";
import { env } from "@/config/env";
import { ServiceUnavailableError, TooManyRequestsError } from "@/core/errors";

// Atomic, shared across replicas, expires even if the process crashes. Fail closed.
export const reserveScript = `
local limits = {tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])}
for i=1,3 do
  if tonumber(redis.call('GET', KEYS[i]) or '0') >= limits[i] then return 0 end
end
for i=1,3 do
  redis.call('INCR', KEYS[i])
  if redis.call('TTL', KEYS[i]) < 0 then redis.call('EXPIRE', KEYS[i], tonumber(ARGV[i+3])) end
end
return 1`;
export async function reserveAssistantTurn(
  tenantId: string,
  sessionId: string,
  expiresAt: Date,
) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const day = Math.floor(now / 86400000);
  let allowed: unknown;
  try {
    allowed = await redis.eval(
      reserveScript,
      3,
      `assistant:session:${sessionId}:minute:${minute}`,
      `assistant:session:${sessionId}:turns`,
      `assistant:tenant:${tenantId}:day:${day}`,
      6,
      30,
      env.ASSISTANT_DAILY_TURN_LIMIT,
      61,
      Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
      86401,
    );
  } catch {
    throw new ServiceUnavailableError(
      "Menu assistant is temporarily unavailable. Please browse the menu or ask staff.",
    );
  }
  if (Number(allowed) !== 1)
    throw new TooManyRequestsError(
      "Assistant limit reached. Please browse the menu or ask staff.",
    );
}
