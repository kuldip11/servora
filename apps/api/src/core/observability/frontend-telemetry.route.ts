import { Elysia, t } from "elysia";
import { metrics } from "./metrics";

const frontendTelemetryBody = t.Object({
  type: t.Union([
    t.Literal("web-vital"),
    t.Literal("error"),
    t.Literal("unhandled-rejection"),
  ]),
  app: t.String({ minLength: 1, maxLength: 64 }),
  timestamp: t.String({ minLength: 1, maxLength: 64 }),
  route: t.Optional(t.String({ maxLength: 256 })),
  message: t.Optional(t.String({ maxLength: 1000 })),
  metric: t.Optional(
    t.Object({
      name: t.Union([
        t.Literal("CLS"),
        t.Literal("INP"),
        t.Literal("LCP"),
        t.Literal("TTFB"),
      ]),
      value: t.Number({ minimum: 0 }),
      rating: t.Union([
        t.Literal("good"),
        t.Literal("needs-improvement"),
        t.Literal("poor"),
      ]),
      navigationType: t.Optional(t.String({ maxLength: 64 })),
    }),
  ),
});

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
  { body: frontendTelemetryBody },
);
