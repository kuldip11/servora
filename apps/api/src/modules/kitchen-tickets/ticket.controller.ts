import type { AuthContext } from "@/core/auth";
import type { Logger } from "@/core/logger";
import { successResponse } from "@/core/response";
import { ticketService } from "./ticket.service";
import type { KitchenTicketStatus } from "@pos/types";
import { toKitchenQueueTicketResponse } from "./ticket.mapper";
import { toKitchenStationResponse } from "./stations/station.mapper";

export const ticketController = {
  async getQueue(auth: AuthContext, stationId?: string) {
    const queue = await ticketService.getQueueForCurrentBranch(auth, stationId);
    return successResponse(queue.map(toKitchenQueueTicketResponse));
  },

  async listStations(auth: AuthContext) {
    return successResponse(
      (await ticketService.listStationsForCurrentBranch(auth)).map(
        toKitchenStationResponse,
      ),
    );
  },

  async updateStatus(
    auth: AuthContext,
    logger: Logger,
    ticketId: string,
    status: KitchenTicketStatus,
  ) {
    const updated = await ticketService.updateStatus(
      auth,
      logger,
      ticketId,
      status,
    );
    return successResponse(toKitchenQueueTicketResponse(updated));
  },
};
