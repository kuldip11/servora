import { createOrderService } from "./create-order.service";
import { orderQueryService } from "./order-query.service";
import { orderStatusService } from "./order-status.service";
import { orderAdjustmentService } from "./order-adjustment.service";
import { orderFireService } from "./order-fire.service";
import { orderKitchenService } from "./order-kitchen.service";
import { orderTableService } from "./order-table.service";

export const orderService = {
  list: orderQueryService.list,
  search: orderQueryService.search,
  getById: orderQueryService.getById,
  getInventoryImpact: orderQueryService.getInventoryImpact,
  create: createOrderService.create,
  updateStatus: orderStatusService.updateStatus,
  voidItem: orderAdjustmentService.voidItem,
  compItem: orderAdjustmentService.compItem,
  fireTicket: orderFireService.fireTicket,
  refireItem: orderKitchenService.refireItem,
  refillItem: orderKitchenService.refillItem,
  transferTable: orderTableService.transferTable,
  mergeOrders: orderTableService.mergeOrders,
};

export type { CreateOrderInput } from "./create-order.service";
export type { FireTicketInput } from "./order-fire.service";
