import { Type, type Static } from "@sinclair/typebox";

export const paginationPageSchema = Type.Integer({ minimum: 1, default: 1 });
export const paginationLimitSchema = Type.Integer({
  minimum: 1,
  maximum: 100,
  default: 25,
});

export const paginationQuerySchema = Type.Object({
  page: Type.Optional(paginationPageSchema),
  limit: Type.Optional(paginationLimitSchema),
});

export const paginationMetaSchema = Type.Object({
  total: Type.Integer({ minimum: 0 }),
  page: Type.Integer({ minimum: 1 }),
  limit: Type.Integer({ minimum: 1 }),
  hasMore: Type.Boolean(),
});

export type PaginationQuery = Static<typeof paginationQuerySchema>;
export type PaginationMeta = Static<typeof paginationMetaSchema>;
