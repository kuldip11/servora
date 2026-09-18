import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import {
  paginatedResponseSchema,
  successResponseSchema,
} from "../common/responses";
import {
  inventoryTransactionTypeSchema,
  inventoryUnitSchema,
} from "./requests";

const nullableUuid = Type.Union([uuidSchema, Type.Null()]);
const nullableString = Type.Union([Type.String(), Type.Null()]);

export const inventoryBranchSummarySchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
  },
  { additionalProperties: false },
);

export const inventoryItemSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    branch: Type.Optional(inventoryBranchSummarySchema),
    name: Type.String(),
    unit: inventoryUnitSchema,
    currentStock: Type.Number(),
    minimumStock: Type.Number(),
    reorderPoint: Type.Number(),
    costPerUnit: Type.Number(),
    isActive: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const wasteReasonSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    label: Type.String(),
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const inventoryUserSummarySchema = Type.Object(
  {
    id: uuidSchema,
    firstName: Type.Union([Type.String(), Type.Null()]),
    lastName: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false },
);

export const inventoryTransactionSchema = Type.Object(
  {
    id: uuidSchema,
    inventoryItemId: uuidSchema,
    transactionType: inventoryTransactionTypeSchema,
    quantity: Type.Number(),
    balanceBefore: Type.Number(),
    balanceAfter: Type.Number(),
    notes: nullableString,
    performedBy: nullableUuid,
    reversalOfDeductionId: nullableUuid,
    wasteReasonId: nullableUuid,
    wasteReason: Type.Union([wasteReasonSchema, Type.Null()]),
    createdAt: isoDateTimeSchema,
    inventoryItem: inventoryItemSchema,
    performedByUser: Type.Union([inventoryUserSummarySchema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const inventoryStockUpdateSchema = Type.Object(
  {
    item: inventoryItemSchema,
    transaction: inventoryTransactionSchema,
  },
  { additionalProperties: false },
);

export const inventoryRecipeImpactSchema = Type.Object(
  {
    inventoryItemId: uuidSchema,
    inventoryItemName: Type.String(),
    impacts: Type.Array(
      Type.Object(
        {
          kind: Type.Union([
            Type.Literal("ITEM"),
            Type.Literal("VARIANT"),
            Type.Literal("MODIFIER_OPTION"),
          ]),
          menuItemId: uuidSchema,
          menuItemName: Type.String(),
          entityId: uuidSchema,
          entityName: Type.String(),
          computedAvailable: Type.Boolean(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const inventoryItemResponseSchema =
  successResponseSchema(inventoryItemSchema);
export const inventoryItemListResponseSchema =
  paginatedResponseSchema(inventoryItemSchema);
export const inventoryItemArrayResponseSchema = successResponseSchema(
  Type.Array(inventoryItemSchema),
);
export const inventoryTransactionArrayResponseSchema = successResponseSchema(
  Type.Array(inventoryTransactionSchema),
);
export const inventoryStockUpdateResponseSchema = successResponseSchema(
  inventoryStockUpdateSchema,
);
export const inventoryRecipeImpactResponseSchema = successResponseSchema(
  inventoryRecipeImpactSchema,
);
export const wasteReasonResponseSchema =
  successResponseSchema(wasteReasonSchema);
export const wasteReasonArrayResponseSchema = successResponseSchema(
  Type.Array(wasteReasonSchema),
);

export type InventoryItemResponse = Static<typeof inventoryItemSchema>;
export type InventoryTransactionResponse = Static<
  typeof inventoryTransactionSchema
>;
export type WasteReasonResponse = Static<typeof wasteReasonSchema>;
export type InventoryRecipeImpactResponse = Static<
  typeof inventoryRecipeImpactSchema
>;
