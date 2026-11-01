// Compatibility re-exports during the API contract migration.
// Authoritative transport schemas live in @pos/contracts.
export {
  compOrderItemBodySchema as compOrderItemBody,
  createOrderBodySchema as createOrderBody,
  fireTicketBodySchema as fireTicketBody,
  mergeOrderBodySchema as mergeOrderBody,
  orderIdParamsSchema as orderIdParams,
  orderItemParamsSchema as orderItemParams,
  orderListQuerySchema as orderListQuery,
  refireOrderItemBodySchema as refireOrderItemBody,
  transferTableBodySchema as transferTableBody,
  updateOrderStatusBodySchema as updateOrderStatusBody,
  voidOrderItemBodySchema as voidOrderItemBody,
} from "@pos/contracts";
