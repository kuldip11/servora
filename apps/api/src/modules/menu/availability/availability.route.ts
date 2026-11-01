import { Elysia } from "elysia";
import {
  availabilityBranchOverrideListResponseSchema,
  availabilityBranchOverrideResponseSchema,
  availabilityChannelOverrideListResponseSchema,
  availabilityChannelOverrideResponseSchema,
  availabilityCurrentStatusResponseSchema,
  availabilityDashboardQuerySchema,
  availabilityDashboardResponseSchema,
  availabilityHolidayListResponseSchema,
  availabilityHolidayResponseSchema,
  availabilityItemStateResponseSchema,
  availabilityScheduleListResponseSchema,
  availabilityScheduleResponseSchema,
  availabilityStockCountResponseSchema,
  availabilityVariantOverrideResponseSchema,
  effectiveAvailabilityItemResponseSchema,
  availabilityNullSuccessResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { availabilityController } from "./availability.controller";
import {
  createScheduleBody,
  updateScheduleBody,
  itemIdParams,
  scheduleIdParams,
  itemBranchParams,
  currentStatusQuery,
  holidayQuery,
  createHolidayBody,
  updateHolidayBody,
  holidayIdParams,
  upsertOverrideBody,
  manualOverrideBody,
  channelOverrideBody,
  variantOverrideBody,
  stockCountBody,
} from "./availability.validator";

export const menuAvailabilityRouter = new Elysia({ prefix: "/api/menu" })
  .use(requireAuthPlugin())
  .get(
    "/availability/dashboard",
    ({ auth, query }) => availabilityController.dashboard(auth, query),
    {
      query: availabilityDashboardQuerySchema,
      response: {
        200: availabilityDashboardResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/variants/:id/availability",
    ({ auth, params, body }) =>
      availabilityController.setVariantOverride(auth, params.id, body),
    {
      params: itemIdParams,
      body: variantOverrideBody,
      response: {
        200: availabilityVariantOverrideResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/items/:id/stock-count",
    ({ auth, params, body }) =>
      availabilityController.setStockCount(auth, params.id, body),
    {
      params: itemIdParams,
      body: stockCountBody,
      response: {
        200: availabilityStockCountResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/items/:id/schedules",
    ({ auth, params }) => availabilityController.listSchedules(auth, params.id),
    {
      params: itemIdParams,
      response: {
        200: availabilityScheduleListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/items/:id/schedules",
    ({ auth, params, body, set }) => {
      set.status = 201;
      return availabilityController.createSchedule(auth, params.id, body);
    },
    {
      params: itemIdParams,
      body: createScheduleBody,
      response: {
        201: availabilityScheduleResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/items/schedules/:scheduleId",
    ({ auth, params, body }) =>
      availabilityController.updateSchedule(auth, params.scheduleId, body),
    {
      params: scheduleIdParams,
      body: updateScheduleBody,
      response: {
        200: availabilityScheduleResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/items/schedules/:scheduleId",
    ({ auth, params }) =>
      availabilityController.deleteSchedule(auth, params.scheduleId),
    {
      params: scheduleIdParams,
      response: {
        200: availabilityNullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/items/:id/current-status",
    ({ auth, params, query }) =>
      availabilityController.getCurrentStatus(auth, params.id, query.timestamp),
    {
      params: itemIdParams,
      query: currentStatusQuery,
      response: {
        200: availabilityCurrentStatusResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/items/:id/manual-override",
    ({ auth, params, body }) =>
      availabilityController.setManualOverride(auth, params.id, body),
    {
      params: itemIdParams,
      body: manualOverrideBody,
      response: {
        200: availabilityItemStateResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/items/:id/manual-override",
    ({ auth, params }) =>
      availabilityController.clearManualOverride(auth, params.id),
    {
      params: itemIdParams,
      response: {
        200: availabilityItemStateResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/items/:id/branch/:branchId",
    ({ auth, params }) =>
      availabilityController.getEffectiveItem(auth, params.id, params.branchId),
    {
      params: itemBranchParams,
      response: {
        200: effectiveAvailabilityItemResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/items/:id/branch/:branchId",
    ({ auth, params, body }) =>
      availabilityController.upsertOverride(
        auth,
        params.id,
        params.branchId,
        body,
      ),
    {
      params: itemBranchParams,
      body: upsertOverrideBody,
      response: {
        200: availabilityBranchOverrideResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/items/:id/branch/:branchId",
    ({ auth, params }) =>
      availabilityController.deleteOverride(auth, params.id, params.branchId),
    {
      params: itemBranchParams,
      response: {
        200: availabilityNullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/items/:id/branches",
    ({ auth, params }) =>
      availabilityController.listOverridesForItem(auth, params.id),
    {
      params: itemIdParams,
      response: {
        200: availabilityBranchOverrideListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/items/:id/channel-overrides",
    ({ auth, params }) =>
      availabilityController.listChannelOverrides(auth, params.id),
    {
      params: itemIdParams,
      response: {
        200: availabilityChannelOverrideListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/items/:id/channel-overrides",
    ({ auth, params, body }) =>
      availabilityController.upsertChannelOverride(auth, params.id, body),
    {
      params: itemIdParams,
      body: channelOverrideBody,
      response: {
        200: availabilityChannelOverrideResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/items/channel-overrides/:id",
    ({ auth, params }) =>
      availabilityController.deleteChannelOverride(auth, params.id),
    {
      params: itemIdParams,
      response: {
        200: availabilityNullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/holidays",
    ({ auth, query }) =>
      availabilityController.listHolidays(auth, query.year, query.region),
    {
      query: holidayQuery,
      response: {
        200: availabilityHolidayListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/holidays",
    ({ auth, body, set }) => {
      set.status = 201;
      return availabilityController.createHoliday(auth, body);
    },
    {
      body: createHolidayBody,
      response: {
        201: availabilityHolidayResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/holidays/:id",
    ({ auth, params, body }) =>
      availabilityController.updateHoliday(auth, params.id, body),
    {
      params: holidayIdParams,
      body: updateHolidayBody,
      response: {
        200: availabilityHolidayResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .delete(
    "/holidays/:id",
    ({ auth, params }) => availabilityController.deleteHoliday(auth, params.id),
    {
      params: holidayIdParams,
      response: {
        200: availabilityNullSuccessResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
