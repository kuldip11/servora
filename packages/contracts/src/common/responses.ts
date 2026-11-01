import { Type, type Static, type TSchema } from "@sinclair/typebox";
import { paginationMetaSchema } from "./pagination";
import { apiErrorResponseSchema } from "./errors";

export const successResponseSchema = <T extends TSchema>(data: T) =>
  Type.Object(
    {
      success: Type.Literal(true),
      data,
    },
    { additionalProperties: false },
  );

export const paginatedResponseSchema = <T extends TSchema>(item: T) =>
  Type.Object(
    {
      success: Type.Literal(true),
      data: Type.Array(item),
      pagination: paginationMetaSchema,
    },
    { additionalProperties: false },
  );

export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type PaginatedResponse<T> = {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export type StaticSuccessResponse<T extends TSchema> = Static<
  ReturnType<typeof successResponseSchema<T>>
>;

export const standardErrorResponseSchemas = {
  400: apiErrorResponseSchema,
  401: apiErrorResponseSchema,
  403: apiErrorResponseSchema,
  404: apiErrorResponseSchema,
  409: apiErrorResponseSchema,
  422: apiErrorResponseSchema,
  429: apiErrorResponseSchema,
  500: apiErrorResponseSchema,
  503: apiErrorResponseSchema,
} as const;
