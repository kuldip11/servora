import { Type } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const analyticsCostMarginQuerySchema = Type.Object(
  {
    categoryId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const analyticsMenuEngineeringQuerySchema = Type.Object(
  {
    windowDays: Type.Optional(
      Type.String({
        pattern: "^(?:[7-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|36[0-5])$",
      }),
    ),
  },
  { additionalProperties: false },
);
