import type {
  PaginatedResponse,
  PaginationMeta,
  SuccessResponse,
} from "@pos/contracts";

export type {
  PaginatedResponse,
  PaginationMeta,
  SuccessResponse,
} from "@pos/contracts";

export const successResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
});

export const createdResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
});

export const listResponse = <T>(data: T[]): SuccessResponse<T[]> => ({
  success: true,
  data,
});

export const paginatedResponse = <T>(
  data: T[],
  pagination: { page: number; limit: number; total: number },
): PaginatedResponse<T> => ({
  success: true,
  data,
  pagination: {
    ...pagination,
    hasMore: pagination.page * pagination.limit < pagination.total,
  },
});
