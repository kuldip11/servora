import { Elysia } from "elysia";
import { randomUUID } from "crypto";
import { env } from "@/config/env";
import { resolveClientIp } from "@/core/security/client-ip";

export interface RequestContext {
  requestId: string;
  startTime: number;
  userAgent?: string;
  ip?: string;
}

export const requestContextPlugin = (now: () => number = Date.now) =>
  new Elysia({ name: "request-context" })
    .derive({ as: "global" }, ({ headers, request, server }) => {
      const directIp = server?.requestIP(request)?.address;
      return {
        requestContext: {
          requestId: randomUUID(),
          startTime: now(),
          userAgent: headers["user-agent"],
          ip: resolveClientIp(headers, directIp, env.TRUST_PROXY_HOPS),
        } as RequestContext,
      };
    })
    .onAfterHandle({ as: "global" }, ({ set, requestContext }) => {
      const duration = now() - requestContext.startTime;
      set.headers["x-request-id"] = requestContext.requestId;
      set.headers["x-response-time"] = `${duration}ms`;
    });
