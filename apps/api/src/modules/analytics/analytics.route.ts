import { Elysia } from "elysia";
import {
  analyticsCostMarginQuerySchema,
  analyticsCostMarginResponseSchema,
  analyticsDashboardResponseSchema,
  analyticsMenuEngineeringQuerySchema,
  analyticsMenuEngineeringResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { analyticsController } from "./analytics.controller";

export const analyticsRouter = new Elysia()
  .use(requireAuthPlugin())
  .get(
    "/api/analytics/dashboard",
    ({ auth }) => analyticsController.getDashboard(auth),
    {
      response: {
        200: analyticsDashboardResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/analytics/cost-margin",
    ({ auth, query }) =>
      analyticsController.getCostMarginReport(auth, query.categoryId),
    {
      query: analyticsCostMarginQuerySchema,
      response: {
        200: analyticsCostMarginResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/analytics/menu-engineering",
    ({ auth, query }) =>
      analyticsController.getMenuEngineeringReport(auth, query.windowDays),
    {
      query: analyticsMenuEngineeringQuerySchema,
      response: {
        200: analyticsMenuEngineeringResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
