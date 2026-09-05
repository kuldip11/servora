import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  org: {
    list: vi.fn(), tenants: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn(),
  },
  branches: { list: vi.fn(), create: vi.fn(), update: vi.fn(), deactivate: vi.fn() },
  audit: { list: vi.fn(), menuHistory: vi.fn() },
  orders: {
    listCancellationReasons: vi.fn(), listAllCancellationReasons: vi.fn(), createCancellationReason: vi.fn(), updateCancellationReason: vi.fn(),
  },
  billing: { collectPayment: vi.fn(), getOrderBills: vi.fn(), splitOrder: vi.fn(), splitOrderByItems: vi.fn(), splitOrderBySeat: vi.fn() },
  analytics: { dashboard: vi.fn(), costMargin: vi.fn() },
  createTenant: vi.fn(), updateTenant: vi.fn(), archiveTenant: vi.fn(),
}));

vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@pos/api-client", () => ({
  createOrganizationsApi: () => h.org,
  createBranchesApi: () => h.branches,
  createAuditApi: () => h.audit,
  createOrdersApi: () => h.orders,
  createBillingApi: () => h.billing,
  createAnalyticsApi: () => h.analytics,
}));
vi.mock("@/features/auth/services/auth.service", () => ({ authService: { createTenant: h.createTenant, updateTenant: h.updateTenant, archiveTenant: h.archiveTenant } }));

import { businessService } from "@/features/business/services/business.service";
import { auditService } from "@/features/audit/services/audit.service";
import { cancellationReasonsService } from "@/features/orders/services/cancellation-reasons.service";
import { billingService } from "@/features/billing/services/billing.service";
import { analyticsService } from "@/features/analytics/services/analytics.service";

describe("web service coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const fn of Object.values(h.org)) fn.mockResolvedValue([]);
    for (const fn of Object.values(h.branches)) fn.mockResolvedValue([]);
    for (const fn of Object.values(h.audit)) fn.mockResolvedValue([]);
    for (const fn of Object.values(h.orders)) fn.mockResolvedValue([]);
    for (const fn of Object.values(h.billing)) fn.mockResolvedValue([]);
    for (const fn of Object.values(h.analytics)) fn.mockResolvedValue([]);
    h.createTenant.mockResolvedValue({}); h.updateTenant.mockResolvedValue({}); h.archiveTenant.mockResolvedValue({});
  });

  it("covers business CRUD and normalization", async () => {
    await businessService.organizations();
    await businessService.franchises("o1");
    await businessService.branches();
    const org: any = { name: " Org ", legalName: "", taxId: "   ", contactEmail: "x@test.com" };
    await businessService.createOrganization(org);
    await businessService.updateOrganization("o1", org);
    await businessService.archiveOrganization("o1");
    const franchise: any = { name: "F", slug: "", timezone: "Asia/Kolkata", currency: "INR" };
    await businessService.createFranchise("o1", franchise);
    await businessService.updateFranchise("t1", franchise);
    await businessService.archiveFranchise("t1");
    const branch: any = { name: "B", code: "B1", currency: "INR", addressLine1: "Road", addressLine2: "", phone: "", customerQrEnabled: true, status: "ACTIVE" };
    await businessService.createBranch(branch);
    await businessService.updateBranch("b1", { ...branch, status: "INACTIVE", customerQrEnabled: false });
    await businessService.archiveBranch("b1");
    expect(h.org.create).toHaveBeenCalledWith(expect.objectContaining({ legalName: null, taxId: null }));
    expect(h.createTenant).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "o1", slug: null }));
    expect(h.branches.create).toHaveBeenCalledWith(expect.objectContaining({ address: "Road", onlineEnabled: true, isActive: true, phone: null }));
    expect(h.branches.update).toHaveBeenCalledWith("b1", expect.objectContaining({ onlineEnabled: false, isActive: false }));
  });

  it("covers audit and cancellation-reason services", async () => {
    await auditService.list();
    await auditService.list(10, "cursor");
    await auditService.menuHistory();
    await auditService.menuHistory({ entityType: "MENU", limit: 5 });
    expect(h.audit.list).toHaveBeenNthCalledWith(1, { limit: 50, before: undefined });
    expect(h.audit.list).toHaveBeenNthCalledWith(2, { limit: 10, before: "cursor" });

    await cancellationReasonsService.list();
    await cancellationReasonsService.list(false);
    await cancellationReasonsService.listAll();
    await cancellationReasonsService.create("Mistake");
    await cancellationReasonsService.update("r1", { label: "Changed", isActive: false });
    expect(h.orders.listCancellationReasons).toHaveBeenCalled();
    expect(h.orders.listAllCancellationReasons).toHaveBeenCalledTimes(2);
  });

  it("covers billing optional fields and split helpers", async () => {
    await billingService.collectPayment("o1", { method: "CASH", amount: 100 });
    await billingService.collectPayment("o1", { method: "CARD", amount: 50, billId: "b1", reference: "ref" });
    await billingService.getOrderBills("o1");
    await billingService.splitOrder("o1", 2);
    await billingService.splitOrderByItems("o1", []);
    await billingService.splitOrderBySeat("o1", "EVEN_SPLIT");
    expect(h.billing.collectPayment).toHaveBeenNthCalledWith(1, { orderId: "o1", method: "CASH", amount: 100 });
    expect(h.billing.collectPayment).toHaveBeenNthCalledWith(2, { orderId: "o1", method: "CARD", amount: 50, billId: "b1", reference: "ref" });
  });

  it("covers analytics service branches", async () => {
    await analyticsService.dashboard();
    await analyticsService.costMargin();
    await analyticsService.costMargin("c1");
    expect(h.analytics.costMargin).toHaveBeenNthCalledWith(1, {});
    expect(h.analytics.costMargin).toHaveBeenNthCalledWith(2, { categoryId: "c1" });
  });
});
