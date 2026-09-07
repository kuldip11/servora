import type { TableStatus } from "./tables";

export interface RestaurantTable {
  id: string;
  tenantId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  name: string;
  capacity: number;
  status: TableStatus;
  section: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}
