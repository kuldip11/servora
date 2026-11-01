import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";

const nullableNumber = Type.Union([Type.Number(), Type.Null()]);
const nullableUuid = Type.Union([uuidSchema, Type.Null()]);
const nullableString = Type.Union([Type.String(), Type.Null()]);

export const analyticsDashboardSchema = Type.Object(
  {
    totalOrdersToday: Type.Integer({ minimum: 0 }),
    revenueToday: Type.Number(),
    activeOrders: Type.Integer({ minimum: 0 }),
    lowStockAlerts: Type.Integer({ minimum: 0 }),
    paidOrdersToday: Type.Integer({ minimum: 0 }),
    cancelledOrdersToday: Type.Integer({ minimum: 0 }),
    averageOrderValue: Type.Number(),
    topItems: Type.Array(
      Type.Object(
        {
          name: Type.String(),
          count: Type.Integer({ minimum: 0 }),
          revenue: Type.Number(),
        },
        { additionalProperties: false },
      ),
    ),
    revenueByHour: Type.Array(
      Type.Object(
        {
          hour: Type.Integer({ minimum: 0, maximum: 23 }),
          revenue: Type.Number(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const analyticsCostMarginRowSchema = Type.Object(
  {
    menuItemId: uuidSchema,
    menuItemName: Type.String(),
    categoryId: uuidSchema,
    categoryName: Type.String(),
    variantId: nullableUuid,
    variantName: nullableString,
    price: Type.Number(),
    manualCost: nullableNumber,
    recipeCost: nullableNumber,
    effectiveCost: nullableNumber,
    costSource: Type.Union([
      Type.Literal("RECIPE"),
      Type.Literal("MANUAL"),
      Type.Literal("UNKNOWN"),
    ]),
    cost: nullableNumber,
    margin: nullableNumber,
    marginPercent: nullableNumber,
  },
  { additionalProperties: false },
);

export const analyticsMenuEngineeringRowSchema = Type.Intersect([
  analyticsCostMarginRowSchema,
  Type.Object(
    {
      salesVolume: Type.Integer({ minimum: 0 }),
      quadrant: Type.Union([
        Type.Literal("STAR"),
        Type.Literal("PUZZLE"),
        Type.Literal("PLOWHORSE"),
        Type.Literal("DOG"),
        Type.Literal("COST_MISSING"),
      ]),
      recommendation: Type.String(),
    },
    { additionalProperties: false },
  ),
]);

export const analyticsDashboardResponseSchema = successResponseSchema(
  analyticsDashboardSchema,
);
export const analyticsCostMarginResponseSchema = successResponseSchema(
  Type.Array(analyticsCostMarginRowSchema),
);
export const analyticsMenuEngineeringResponseSchema = successResponseSchema(
  Type.Array(analyticsMenuEngineeringRowSchema),
);

export type AnalyticsDashboardResponse = Static<
  typeof analyticsDashboardSchema
>;
export type AnalyticsCostMarginRowResponse = Static<
  typeof analyticsCostMarginRowSchema
>;
export type AnalyticsMenuEngineeringRowResponse = Static<
  typeof analyticsMenuEngineeringRowSchema
>;
