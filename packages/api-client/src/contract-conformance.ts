import type {
  AnalyticsDashboardResponse,
  ApprovalThreshold,
  AuditLogResponse,
  AuthTokenResponse,
  AuthUserResponse,
  AvailabilityDashboardResponse,
  BillResponse,
  BranchResponse,
  InventoryItemResponse,
  KitchenQueueTicketResponse,
  ManagerApprovalToken,
  OrganizationResponse,
  OrderExplainResponse,
  OrderResponse,
  PermissionResponseItem,
  RoleResponseItem,
  StaffMemberResponse,
  TableResponse,
  TenantResponse,
} from "@pos/contracts";
import type { createAnalyticsApi } from "./domains/analytics";
import type { createApprovalsApi } from "./domains/approvals";
import type { createAuditApi } from "./domains/audit";
import type { createAuthApi } from "./domains/auth";
import type { createAvailabilityApi } from "./domains/availability";
import type { createBillingApi } from "./domains/billing";
import type { createBranchesApi } from "./domains/branches";
import type { createInventoryApi } from "./domains/inventory";
import type { createKitchenApi } from "./domains/kitchen";
import type { createOrdersApi } from "./domains/orders";
import type { createOrganizationsApi } from "./domains/organizations";
import type { createSettingsApi } from "./domains/settings";
import type { createStaffApi } from "./domains/staff";
import type { createTablesApi } from "./domains/tables";
import type {
  OpenApiOperationId,
  OpenApiSuccessResponse,
} from "./generated/openapi-contract";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;

type Expect<Value extends true> = Value;
type ApiResult<Api, Key extends keyof Api> = Api[Key] extends (
  ...args: infer _Arguments
) => infer Result
  ? Awaited<Result>
  : never;
type OperationData<Operation extends OpenApiOperationId> =
  OpenApiSuccessResponse<Operation> extends { data: infer Data } ? Data : never;

type AnalyticsApi = ReturnType<typeof createAnalyticsApi>;
type ApprovalsApi = ReturnType<typeof createApprovalsApi>;
type AuditApi = ReturnType<typeof createAuditApi>;
type AuthApi = ReturnType<typeof createAuthApi>;
type AvailabilityApi = ReturnType<typeof createAvailabilityApi>;
type BillingApi = ReturnType<typeof createBillingApi>;
type BranchesApi = ReturnType<typeof createBranchesApi>;
type InventoryApi = ReturnType<typeof createInventoryApi>;
type KitchenApi = ReturnType<typeof createKitchenApi>;
type OrdersApi = ReturnType<typeof createOrdersApi>;
type OrganizationsApi = ReturnType<typeof createOrganizationsApi>;
type SettingsApi = ReturnType<typeof createSettingsApi>;
type StaffApi = ReturnType<typeof createStaffApi>;
type TablesApi = ReturnType<typeof createTablesApi>;

/**
 * Compile-time-only assertions tying the handwritten domain facade to both
 * server-owned contracts and the generated OpenAPI operation registry.
 * Any drift turns the @pos/api-client typecheck red.
 */
export type ApiClientContractConformance = [
  Expect<Equal<ApiResult<OrdersApi, "get">, OrderResponse>>,
  Expect<Equal<ApiResult<OrdersApi, "get">, OperationData<"getApiOrdersById">>>,
  Expect<Equal<ApiResult<OrdersApi, "explain">, OrderExplainResponse>>,
  Expect<
    Equal<
      ApiResult<OrdersApi, "explain">,
      OperationData<"getApiOrdersByIdExplain">
    >
  >,
  Expect<Equal<ApiResult<InventoryApi, "create">, InventoryItemResponse>>,
  Expect<
    Equal<
      ApiResult<InventoryApi, "create">,
      OperationData<"postApiInventoryItems">
    >
  >,
  Expect<Equal<ApiResult<BranchesApi, "create">, BranchResponse>>,
  Expect<
    Equal<ApiResult<BranchesApi, "create">, OperationData<"postApiBranches">>
  >,
  Expect<Equal<ApiResult<TablesApi, "create">, TableResponse>>,
  Expect<Equal<ApiResult<TablesApi, "create">, OperationData<"postApiTables">>>,
  Expect<Equal<ApiResult<AuthApi, "login">, AuthTokenResponse>>,
  Expect<Equal<ApiResult<AuthApi, "login">, OperationData<"postApiAuthLogin">>>,
  Expect<Equal<ApiResult<AuthApi, "me">, AuthUserResponse>>,
  Expect<Equal<ApiResult<AuthApi, "me">, OperationData<"getApiAuthMe">>>,
  Expect<Equal<ApiResult<BillingApi, "getOrderBills">, BillResponse[]>>,
  Expect<
    Equal<
      ApiResult<BillingApi, "getOrderBills">,
      OperationData<"getApiOrdersByIdBills">
    >
  >,
  Expect<
    Equal<ApiResult<AnalyticsApi, "dashboard">, AnalyticsDashboardResponse>
  >,
  Expect<
    Equal<
      ApiResult<AnalyticsApi, "dashboard">,
      OperationData<"getApiAnalyticsDashboard">
    >
  >,
  Expect<Equal<ApiResult<KitchenApi, "tickets">, KitchenQueueTicketResponse[]>>,
  Expect<
    Equal<
      ApiResult<KitchenApi, "tickets">,
      OperationData<"getApiKitchen-tickets">
    >
  >,
  Expect<
    Equal<
      ApiResult<AvailabilityApi, "dashboard">,
      AvailabilityDashboardResponse
    >
  >,
  Expect<
    Equal<
      ApiResult<AvailabilityApi, "dashboard">,
      OperationData<"getApiMenuAvailabilityDashboard">
    >
  >,
  Expect<
    Equal<
      ApiResult<ApprovalsApi, "requestManagerApproval">,
      ManagerApprovalToken
    >
  >,
  Expect<
    Equal<
      ApiResult<ApprovalsApi, "requestManagerApproval">,
      OperationData<"postApiApprovalsManager">
    >
  >,
  Expect<Equal<ApiResult<ApprovalsApi, "listThresholds">, ApprovalThreshold[]>>,
  Expect<
    Equal<
      ApiResult<ApprovalsApi, "listThresholds">,
      OperationData<"getApiApprovalsThresholds">
    >
  >,
  Expect<Equal<ApiResult<AuditApi, "list">, AuditLogResponse[]>>,
  Expect<Equal<ApiResult<AuditApi, "list">, OperationData<"getApiAudit">>>,
  Expect<Equal<ApiResult<StaffApi, "addStaff">, StaffMemberResponse>>,
  Expect<Equal<ApiResult<StaffApi, "addStaff">, OperationData<"postApiStaff">>>,
  Expect<Equal<ApiResult<StaffApi, "listRoles">, RoleResponseItem[]>>,
  Expect<Equal<ApiResult<StaffApi, "listRoles">, OperationData<"getApiRoles">>>,
  Expect<
    Equal<ApiResult<StaffApi, "listPermissions">, PermissionResponseItem[]>
  >,
  Expect<
    Equal<
      ApiResult<StaffApi, "listPermissions">,
      OperationData<"getApiPermissions">
    >
  >,
  Expect<Equal<ApiResult<OrganizationsApi, "list">, OrganizationResponse[]>>,
  Expect<
    Equal<
      ApiResult<OrganizationsApi, "list">,
      OperationData<"getApiOrganizations">
    >
  >,
  Expect<Equal<ApiResult<SettingsApi, "updateTenant">, TenantResponse>>,
  Expect<
    Equal<
      ApiResult<SettingsApi, "updateTenant">,
      OperationData<"patchApiTenantsById">
    >
  >,
];
