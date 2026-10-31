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
export { classifyApiErrorForUi } from "./error-presentation";
export type {
  ApiErrorUiKind,
  ApiErrorUiPresentation,
} from "./error-presentation";
export { createOrdersApi } from "./domains/orders";
export type {
  OrdersListFilters,
  OrderAdjustmentReason,
  OrderDto,
  OrderKitchenTicketDto,
  OrderExplanationDto,
  CancellationReasonDto,
} from "./domains/orders";
export { createInventoryApi } from "./domains/inventory";
export type {
  LogWasteInput,
  InventoryListFilters,
  InventoryItemDto,
  InventoryRecipeImpactDto,
  InventoryTransactionDto,
  InventoryStockUpdateDto,
  InventoryUnitDto,
  InventoryTransactionTypeDto,
  WasteReasonDto,
} from "./domains/inventory";
export { createMenuApi } from "./domains/menu";
export type {
  ActiveMenuDto,
  BranchOverrideInput,
  CreateMenuItemInput,
  MenuAllergenDto,
  MenuBranchOverrideDto,
  MenuCategoryDto,
  MenuChannelOverrideDto,
  MenuComboDto,
  MenuDto,
  MenuFulfillmentTypeDto,
  MenuHolidayDto,
  MenuImportCommitDto,
  MenuImportValidationDto,
  MenuItemDto,
  MenuItemScheduleDto,
  MenuItemStatusDto,
  MenuKitchenRouteDto,
  MenuKitchenStationDto,
  MenuLoyaltyTierDto,
  MenuPriceRuleDto,
  MenuPromotionDto,
  MenuPromotionPreviewDto,
  MenuPromotionStatsDto,
  MenuComboPreviewDto,
  MenuRecipeDto,
  MenuScheduleDto,
  MenuScheduleInput,
  MenuWindowInput,
  MenuTagDto,
  MenuTemplateDto,
  ModifierGroupDto,
  ModifierGroupPayload,
  SubRecipeDto,
  SubRecipeInput,
  UpdateMenuItemInput,
} from "./domains/menu";
export { createCustomersApi } from "./domains/customers";
export type {
  CreateLoyaltyCustomerInput,
  LoyaltyCustomerDto,
  CustomerGroupDto,
  CustomerRequestDto,
  CustomerGroupInput,
} from "./domains/customers";
export type { DomainHttpClient, PaginatedResult } from "./domains/shared";
export { createBranchesApi } from "./domains/branches";
export type { BranchDto, BranchInput } from "./domains/branches";
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
  BillDto,
  PaymentCollectionResultDto,
  SeatSplitResult,
} from "./domains/billing";
export { createAuthApi } from "./domains/auth";
export type {
  AuthResponse,
  SignupInput,
  LoginInput,
  TenantSummary,
  UpdateTenantInput,
  AuthUserDto,
  AvailableMembershipDto,
  OrganizationDto,
  TenantDto,
  AvailableTenantDto,
} from "./domains/auth";
export { createApprovalsApi } from "./domains/approvals";
export type {
  ManagerApprovalInput,
  ManagerApprovalResult,
  ApprovalThresholdDto,
  ApprovalThresholdInput,
} from "./domains/approvals";
export { createAnalyticsApi } from "./domains/analytics";
export type {
  AnalyticsDashboardDto,
  AnalyticsCostMarginRowDto,
  AnalyticsMenuEngineeringRowDto,
} from "./domains/analytics";
export { createAuditApi } from "./domains/audit";
export type { AuditEntryDto, MenuHistoryEntryDto } from "./domains/audit";
export { createAvailabilityApi } from "./domains/availability";
export type {
  AvailabilityDashboardParams,
  AvailabilityDashboardDto,
} from "./domains/availability";
export { createSettingsApi } from "./domains/settings";
export { createOrganizationsApi } from "./domains/organizations";
export type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  CreateOrganizationMenuInput,
  UpdateOrganizationMenuInput,
  CreateOrganizationLoyaltyTierInput,
} from "./domains/organizations";
export { createKitchenApi } from "./domains/kitchen";
export type {
  KitchenTicketDto,
  KitchenStationDto,
  KitchenTicketStatus,
  KitchenTicketUpdateStatus,
} from "./domains/kitchen";

export * from "./generated/openapi-contract";
