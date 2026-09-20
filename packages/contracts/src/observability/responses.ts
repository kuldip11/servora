import { Type } from "@sinclair/typebox";

export const prometheusMetricsResponseSchema = Type.String();
export const noContentResponseSchema = Type.Null();

export const healthResponseSchema = Type.Object(
  {
    status: Type.Literal("ok"),
    timestamp: Type.String({ format: "date-time" }),
    version: Type.String(),
  },
  { additionalProperties: false },
);

export const livenessResponseSchema = Type.Object(
  {
    status: Type.Literal("ok"),
    timestamp: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export const readinessSuccessResponseSchema = Type.Object(
  {
    status: Type.Literal("ready"),
    checks: Type.Object(
      { database: Type.Boolean(), redis: Type.Boolean() },
      { additionalProperties: false },
    ),
    timestamp: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);
