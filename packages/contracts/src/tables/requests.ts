import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const tableStatusSchema = Type.Union([
  Type.Literal("AVAILABLE"),
  Type.Literal("OCCUPIED"),
  Type.Literal("CLEANING"),
  Type.Literal("RESERVED"),
]);

export const createTableBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 50 }),
    capacity: Type.Optional(Type.Integer({ minimum: 1 })),
    section: Type.Optional(Type.String({ maxLength: 50 })),
    branchId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const updateTableBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
    capacity: Type.Optional(Type.Integer({ minimum: 1 })),
    section: Type.Optional(Type.String({ maxLength: 50 })),
    status: Type.Optional(tableStatusSchema),
  },
  { additionalProperties: false },
);

export const updateTableStatusBodySchema = Type.Object(
  { status: tableStatusSchema },
  { additionalProperties: false },
);
export const tableIdParamsSchema = Type.Object({ id: uuidSchema });

export type CreateTableRequest = Static<typeof createTableBodySchema>;
export type UpdateTableRequest = Static<typeof updateTableBodySchema>;
export type TableStatusContract = Static<typeof tableStatusSchema>;
