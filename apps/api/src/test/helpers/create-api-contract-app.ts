import { Elysia } from "elysia";
import { handleApiError } from "@/core/errors";
import { metricsRouter, frontendTelemetryRouter } from "@/core/observability";
import { authRouter, authMeRouter } from "@/modules/auth/auth.route";
import { branchesRouter } from "@/modules/branches/branch.route";
import { tenantsRouter } from "@/modules/tenants/tenant.route";
import { organizationsRouter } from "@/modules/organizations/organization.route";
import { tablesRouter } from "@/modules/tables/table.route";
import { ordersRouter } from "@/modules/orders/order.route";
import { cancellationReasonsRouter } from "@/modules/orders/cancellation-reasons/cancellation-reason.route";
import { kitchenTicketsRouter } from "@/modules/kitchen-tickets/ticket.route";
import { menuItemsRouter } from "@/modules/menu/items/item.route";
import { menuCategoriesRouter } from "@/modules/menu/categories/category.route";
import { menuAvailabilityRouter } from "@/modules/menu/availability/availability.route";
import { menuModifiersRouter } from "@/modules/menu/modifiers/modifier.route";
import { menuBulkOpsRouter } from "@/modules/menu/bulk-ops/bulk-ops.route";
import { menuRecipesRouter } from "@/modules/menu/recipes/recipes.route";
import { subRecipesRouter } from "@/modules/menu/sub-recipes/sub-recipe.route";
import { menuImportExportRouter } from "@/modules/menu/import-export/import-export.route";
import { menuTemplatesRouter } from "@/modules/menu/templates/templates.route";
import { inventoryRouter } from "@/modules/inventory/inventory.route";
import { billingRouter } from "@/modules/billing/billing.route";
import { staffRouter } from "@/modules/staff/staff.route";
import { rolesRouter } from "@/modules/roles/role.route";
import { permissionsRouter } from "@/modules/permissions/permission.route";
import { priceRulesRouter } from "@/modules/menu/pricing/price-rule.route";
import { promotionsRouter } from "@/modules/menu/promotions/promotion.route";
import { loyaltyRouter } from "@/modules/loyalty/loyalty.route";
import { approvalsRouter } from "@/modules/approvals/approval.route";
import { customerGroupsRouter } from "@/modules/customer-groups/customer-group.route";
import { menusRouter } from "@/modules/menu/menus/menu.route";
import { combosRouter } from "@/modules/menu/combos/combo.route";
import { menuMembershipsRouter } from "@/modules/menu/memberships/membership.route";
import { menuChangeLogRouter } from "@/modules/menu/change-log/menu-change-log.route";
import { kitchenStationsRouter } from "@/modules/kitchen-tickets/stations/station.route";
import { analyticsRouter } from "@/modules/analytics/analytics.route";
import { auditRouter } from "@/modules/audit/audit.route";
import { customerRouter } from "@/modules/customer/customer.route";
import { customerRequestRouter } from "@/modules/customer/customer-requests.route";
import { razorpayWebhookRouter } from "@/modules/billing/razorpay-webhook.route";

export const createApiContractApp = () =>
  new Elysia()
    .onError((context) => handleApiError(context as unknown as Record<string, unknown>))
    .use(metricsRouter)
    .use(frontendTelemetryRouter)
    .use(authRouter)
    .use(authMeRouter)
    .use(branchesRouter)
    .use(tenantsRouter)
    .use(organizationsRouter)
    .use(tablesRouter)
    .use(ordersRouter)
    .use(cancellationReasonsRouter)
    .use(kitchenTicketsRouter)
    .use(menuItemsRouter)
    .use(menusRouter)
    .use(combosRouter)
    .use(menuMembershipsRouter)
    .use(menuChangeLogRouter)
    .use(kitchenStationsRouter)
    .use(menuCategoriesRouter)
    .use(menuAvailabilityRouter)
    .use(menuModifiersRouter)
    .use(menuBulkOpsRouter)
    .use(menuRecipesRouter)
    .use(subRecipesRouter)
    .use(menuImportExportRouter)
    .use(menuTemplatesRouter)
    .use(promotionsRouter)
    .use(loyaltyRouter)
    .use(approvalsRouter)
    .use(customerGroupsRouter)
    .use(priceRulesRouter)
    .use(inventoryRouter)
    .use(billingRouter)
    .use(staffRouter)
    .use(rolesRouter)
    .use(permissionsRouter)
    .use(analyticsRouter)
    .use(auditRouter)
    .use(customerRouter)
    .use(customerRequestRouter)
    .use(razorpayWebhookRouter);
