import { Elysia } from "elysia";
import { redis } from "@/lib/redis";
import { env } from "@/config/env";
import { resolveClientIp } from "./client-ip";
import { createApiErrorResponse } from "@/core/errors";
import { randomUUID } from "node:crypto";

const RATE_LIMIT_PREFIX = "servora:rate-limit";

const requestIp = (
  headers: Record<string, string | undefined>,
  directIp: string | undefined,
): string => {
  return resolveClientIp(headers, directIp, env.TRUST_PROXY_HOPS) ?? "unknown";
};

const isRateLimitExempt = (pathname: string): boolean => {
  return (
    pathname.startsWith("/health") ||
    pathname.startsWith("/swagger") ||
    pathname.startsWith("/ws")
  );
};

export const securityHeadersPlugin = () =>
  new Elysia({ name: "security-headers" }).onAfterHandle(
    { as: "global" },
    ({ set }) => {
      set.headers["x-content-type-options"] = "nosniff";
      set.headers["x-frame-options"] = "DENY";
      set.headers["referrer-policy"] = "no-referrer";
      set.headers["permissions-policy"] =
        "camera=(), microphone=(), geolocation=(), payment=()";
      set.headers["cross-origin-opener-policy"] = "same-origin";
      set.headers["cross-origin-resource-policy"] = "same-site";
      set.headers["content-security-policy"] =
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
      if (env.NODE_ENV === "production") {
        set.headers["strict-transport-security"] =
          "max-age=31536000; includeSubDomains";
      }
    },
  );

export const rateLimitPlugin = () =>
  new Elysia({ name: "global-rate-limit" }).onBeforeHandle(
    { as: "global" },
    async ({ request, headers, set, server }) => {
      const pathname = new URL(request.url).pathname;
      if (isRateLimitExempt(pathname)) return;

      const directIp = server?.requestIP(request)?.address;
      const ip = requestIp(
        headers as Record<string, string | undefined>,
        directIp,
      );
      const bucket = Math.floor(
        Date.now() / (env.RATE_LIMIT_WINDOW_SECONDS * 1000),
      );
      const key = `${RATE_LIMIT_PREFIX}:${ip}:${bucket}`;

      try {
        const count = await redis.incr(key);
        if (count === 1)
          await redis.expire(key, env.RATE_LIMIT_WINDOW_SECONDS + 1);

        set.headers["x-ratelimit-limit"] = String(env.RATE_LIMIT_MAX);
        set.headers["x-ratelimit-remaining"] = String(
          Math.max(0, env.RATE_LIMIT_MAX - count),
        );

        if (count > env.RATE_LIMIT_MAX) {
          set.status = 429;
          set.headers["retry-after"] = String(env.RATE_LIMIT_WINDOW_SECONDS);
          const requestId = request.headers.get("x-request-id") ?? randomUUID();
          return createApiErrorResponse({
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again shortly.",
            statusCode: 429,
            requestId,
          });
        }
      } catch {}

      return undefined;
    },
  );
