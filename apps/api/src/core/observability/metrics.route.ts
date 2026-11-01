import { Elysia } from "elysia";
import { timingSafeEqual } from "crypto";
import { env } from "@/config/env";
import { metrics } from "./metrics";
import { createApiErrorResponse } from "@/core/errors";
import { randomUUID } from "node:crypto";
import {
  apiErrorResponseSchema,
  prometheusMetricsResponseSchema,
} from "@pos/contracts";

const tokenMatches = (value: string | undefined): boolean => {
  const prefix = "Bearer ";
  if (!value?.startsWith(prefix)) return false;
  const actual = Buffer.from(value.slice(prefix.length));
  const expected = Buffer.from(env.METRICS_TOKEN);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const metricsRouter = new Elysia().get(
  "/metrics",
  ({ headers, set }) => {
    if (!tokenMatches(headers.authorization)) {
      set.status = 404;
      return createApiErrorResponse({
        code: "ROUTE_NOT_FOUND",
        message: "The requested API endpoint was not found.",
        statusCode: 404,
        requestId: headers["x-request-id"] ?? randomUUID(),
      });
    }
    set.headers["content-type"] = "text/plain; version=0.0.4; charset=utf-8";
    return metrics.renderPrometheus();
  },
  {
    response: {
      200: prometheusMetricsResponseSchema,
      404: apiErrorResponseSchema,
    },
  },
);
