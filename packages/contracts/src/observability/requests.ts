import { Type } from "@sinclair/typebox";

export const frontendTelemetryBodySchema = Type.Object(
  {
    type: Type.Union([
      Type.Literal("web-vital"),
      Type.Literal("error"),
      Type.Literal("unhandled-rejection"),
    ]),
    app: Type.String({ minLength: 1, maxLength: 64 }),
    timestamp: Type.String({ format: "date-time" }),
    route: Type.Optional(Type.String({ maxLength: 256 })),
    message: Type.Optional(Type.String({ maxLength: 1000 })),
    metric: Type.Optional(
      Type.Object(
        {
          name: Type.Union([
            Type.Literal("CLS"),
            Type.Literal("INP"),
            Type.Literal("LCP"),
            Type.Literal("TTFB"),
          ]),
          value: Type.Number({ minimum: 0 }),
          rating: Type.Union([
            Type.Literal("good"),
            Type.Literal("needs-improvement"),
            Type.Literal("poor"),
          ]),
          navigationType: Type.Optional(Type.String({ maxLength: 64 })),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
