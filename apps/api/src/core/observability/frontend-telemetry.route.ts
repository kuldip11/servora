import { Elysia } from "elysia";
import { metrics } from "./metrics";

import {
  frontendTelemetryBodySchema,
  noContentResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";

export const frontendTelemetryRouter = new Elysia().post(
  "/api/telemetry/frontend",
  ({ body }) => {
    if (body.type === "web-vital" && body.metric) {
      metrics.observeDuration(
        "servora_frontend_metric_value",
        body.metric.value,
        {
          app: body.app,
          metric: body.metric.name,
          rating: body.metric.rating,
        },
      );
    } else {
      metrics.increment("servora_frontend_runtime_errors_total", {
        app: body.app,
        type: body.type,
      });
    }

    return new Response(null, { status: 204 });
  },
  {
    body: frontendTelemetryBodySchema,
    response: { 204: noContentResponseSchema, ...standardErrorResponseSchemas },
  },
);
