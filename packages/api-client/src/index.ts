export { createApiClient } from "./create-client";
export type { ApiClientConfig } from "./create-client";
export type { TokenStorageAdapter } from "./types";
export {
  extractApiError,
  extractApiFieldErrors,
  isRetryableApiError,
} from "./extract-error";
export {
  ApiClientErrorException,
  apiClientErrorFromResponse,
  toApiClientError,
} from "./api-error";
export type { ApiClientError, ApiFieldErrors } from "./api-error";
export { createOrdersApi } from "./domains/orders";
export type {
  OrdersListFilters,
  OrderAdjustmentReason,
} from "./domains/orders";
export { createInventoryApi } from "./domains/inventory";
export type { LogWasteInput, InventoryListFilters } from "./domains/inventory";
export { createMenuApi } from "./domains/menu";
export type { CreateMenuItemInput, UpdateMenuItemInput } from "./domains/menu";
export { createCustomersApi } from "./domains/customers";
export type {
  CreateLoyaltyCustomerInput,
  CustomerGroupInput,
} from "./domains/customers";
export type { DomainHttpClient, PaginatedResult } from "./domains/shared";
export { createBranchesApi } from "./domains/branches";
export type { BranchInput } from "./domains/branches";
export { createTablesApi } from "./domains/tables";
export type {
  RestaurantTableDto,
  TableInput,
  TakeawayQrDto,
} from "./domains/tables";
export { createStaffApi } from "./domains/staff";
export type {
  PermissionDto,
  RoleDto,
  StaffRowDto,
  AddStaffInput,
  UpdateStaffInput,
  StaffListFilters,
  CreateRoleInput,
} from "./domains/staff";
export { createBillingApi } from "./domains/billing";
export type {
  CollectPaymentInput as DomainCollectPaymentInput,
  BillItemAllocation,
  SeatSplitResult,
} from "./domains/billing";
export type {
  ModifierGroupPayload,
  MenuScheduleInput,
  BranchOverrideInput,
} from "./domains/menu";
export { createAuthApi } from "./domains/auth";
export type {
  AuthResponse,
  SignupInput,
  LoginInput,
  TenantSummary,
} from "./domains/auth";
export { createApprovalsApi } from "./domains/approvals";
export type {
  ManagerApprovalInput,
  ManagerApprovalResult,
} from "./domains/approvals";
export { createAnalyticsApi } from "./domains/analytics";
export { createAuditApi } from "./domains/audit";
export { createAvailabilityApi } from "./domains/availability";
export type { AvailabilityDashboardParams } from "./domains/availability";
export { createSettingsApi } from "./domains/settings";
export { createOrganizationsApi } from "./domains/organizations";
export { createKitchenApi } from "./domains/kitchen";

export * from "./generated/openapi-contract";
