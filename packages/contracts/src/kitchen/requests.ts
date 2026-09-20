import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common";

export const kitchenStationIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const kitchenStationListQuerySchema = Type.Object(
  { branchId: Type.Optional(uuidSchema) },
  { additionalProperties: false },
);
export const createKitchenStationBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 100 }),
    branchId: Type.Optional(uuidSchema),
    printerIdentifier: Type.Optional(
      Type.Union([Type.String({ maxLength: 200 }), Type.Null()]),
    ),
    sortOrder: Type.Optional(Type.Integer()),
  },
  { additionalProperties: false },
);
export const updateKitchenStationBodySchema = Type.Partial(
  Type.Object(
    {
      name: Type.String({ minLength: 1, maxLength: 100 }),
      printerIdentifier: Type.Union([
        Type.String({ maxLength: 200 }),
        Type.Null(),
      ]),
      sortOrder: Type.Integer(),
    },
    { additionalProperties: false },
  ),
  { minProperties: 1, additionalProperties: false },
);
export const setKitchenRouteBodySchema = Type.Object(
  {
    stationId: uuidSchema,
    modifierOptionId: Type.Optional(Type.Union([uuidSchema, Type.Null()])),
  },
  { additionalProperties: false },
);
export const removeKitchenRouteQuerySchema = Type.Object(
  { modifierOptionId: Type.Optional(uuidSchema) },
  { additionalProperties: false },
);
export const kitchenTicketQueueQuerySchema = Type.Object(
  { stationId: Type.Optional(uuidSchema) },
  { additionalProperties: false },
);

export const kitchenQueueTicketStatusSchema = Type.Union([
  Type.Literal("HELD"),
  Type.Literal("FIRED"),
  Type.Literal("PREPARING"),
  Type.Literal("READY"),
  Type.Literal("SERVED"),
]);
export const kitchenTicketIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const updateKitchenTicketStatusBodySchema = Type.Object(
  { status: kitchenQueueTicketStatusSchema },
  { additionalProperties: false },
);

export type UpdateKitchenTicketStatusRequest = Static<
  typeof updateKitchenTicketStatusBodySchema
>;
