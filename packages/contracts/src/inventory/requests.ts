import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";
import {
  paginationLimitSchema,
  paginationPageSchema,
} from "../common/pagination";

export const inventoryUnitSchema = Type.Union([
  Type.Literal("KG"),
  Type.Literal("GRAMS"),
  Type.Literal("LITERS"),
  Type.Literal("ML"),
  Type.Literal("PIECES"),
  Type.Literal("PACKETS"),
]);

export const inventoryTransactionTypeSchema = Type.Union([
  Type.Literal("IN"),
  Type.Literal("OUT"),
  Type.Literal("ADJUSTMENT"),
  Type.Literal("WASTE"),
]);

export const inventoryItemIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const inventoryListQuerySchema = Type.Object(
  {
    page: Type.Optional(paginationPageSchema),
    limit: Type.Optional(paginationLimitSchema),
    search: Type.Optional(Type.String({ maxLength: 100 })),
    lowStockOnly: Type.Optional(
      Type.Union([Type.Literal("true"), Type.Literal("false")]),
    ),
  },
  { additionalProperties: false },
);

export const createInventoryItemBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    unit: inventoryUnitSchema,
    currentStock: Type.Number({ minimum: 0 }),
    minimumStock: Type.Number({ minimum: 0 }),
    reorderPoint: Type.Number({ minimum: 0 }),
    costPerUnit: Type.Number({ minimum: 0 }),
    branchId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const updateStockBodySchema = Type.Object(
  {
    quantity: Type.Number(),
    transactionType: inventoryTransactionTypeSchema,
    notes: Type.Optional(Type.String({ maxLength: 1000 })),
    wasteReasonId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const logWasteBodySchema = Type.Object(
  {
    quantity: Type.Number({ exclusiveMinimum: 0 }),
    wasteReasonId: uuidSchema,
    notes: Type.Optional(Type.String({ maxLength: 1000 })),
  },
  { additionalProperties: false },
);

export const createWasteReasonBodySchema = Type.Object(
  {
    label: Type.String({ minLength: 1, maxLength: 150 }),
  },
  { additionalProperties: false },
);

export const updateWasteReasonBodySchema = Type.Object(
  {
    label: Type.Optional(Type.String({ minLength: 1, maxLength: 150 })),
    isActive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, minProperties: 1 },
);

export const wasteReasonListQuerySchema = Type.Object(
  {
    includeInactive: Type.Optional(
      Type.Union([Type.Literal("true"), Type.Literal("false")]),
    ),
  },
  { additionalProperties: false },
);

export type CreateInventoryItemRequest = Static<
  typeof createInventoryItemBodySchema
>;
export type UpdateStockRequest = Static<typeof updateStockBodySchema>;
