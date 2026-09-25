import { Elysia } from "elysia";
import { rootLogger } from "@/core/logger";
import { requestContextPlugin } from "@/core/context";
import { metrics } from "./metrics";

export const requestLoggingPlugin = (now: () => number = Date.now) =>
  new Elysia({ name: "request-logging" })
    .use(requestContextPlugin(now))
    .onAfterHandle({ as: "global" }, ({ request, set, requestContext }) => {
      const url = new URL(request.url);
      const durationMs = now() - requestContext.startTime;
      metrics.observeDuration("servora_api_request_duration_ms", durationMs, {
        method: request.method,
        status: String(set.status || 200),
      });
      rootLogger.info("request.completed", {
        requestId: requestContext.requestId,
        method: request.method,
        path: url.pathname,
        statusCode: set.status || 200,
        durationMs,
      });
    });
