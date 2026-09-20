import { Elysia } from "elysia";
import { requireAuthPlugin } from "@/core/auth";
import { ticketController } from "./ticket.controller";
import { updateTicketStatusBody, ticketIdParams } from "./ticket.validator";
import {
  kitchenStationListResponseSchema,
  kitchenQueueTicketListResponseSchema,
  kitchenTicketQueueQuerySchema,
  kitchenQueueTicketResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";

export const kitchenTicketsRouter = new Elysia()
  .use(requireAuthPlugin())
  .get(
    "/api/kitchen-tickets/",
    ({ auth, query }) => ticketController.getQueue(auth, query.stationId),
    {
      query: kitchenTicketQueueQuerySchema,
      response: {
        200: kitchenQueueTicketListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/kitchen-tickets/stations",
    ({ auth }) => ticketController.listStations(auth),
    {
      response: {
        200: kitchenStationListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .patch(
    "/api/kitchen-tickets/:id/status",
    ({ params, body, auth, logger }) =>
      ticketController.updateStatus(auth, logger, params.id, body.status),
    {
      params: ticketIdParams,
      body: updateTicketStatusBody,
      response: {
        200: kitchenQueueTicketResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
