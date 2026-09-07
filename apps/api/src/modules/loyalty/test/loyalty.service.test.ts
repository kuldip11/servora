import { beforeEach, describe, expect, it, vi } from "vitest";
const r = vi.hoisted(() => ({
  listApplicableTiers: vi.fn(),
  findApplicableTier: vi.fn(),
  findTier: vi.fn(),
  createTier: vi.fn(),
  updateTier: vi.fn(),
  removeTier: vi.fn(),
  listCustomers: vi.fn(),
  findCustomer: vi.fn(),
  findOrganizationCustomerIdentity: vi.fn(),
  createCustomer: vi.fn(),
  setOrganizationCustomerIdentity: vi.fn(),
  updateCustomer: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  writeAudit: vi.fn(),
}));
vi.mock("../loyalty.repository", () => ({ loyaltyRepository: r }));
vi.mock("../../../core/auth", () => ({
  requirePermission: authMocks.requirePermission,
}));
vi.mock("../../../core/audit", () => ({ writeAudit: authMocks.writeAudit }));
import { loyaltyService } from "@/modules/loyalty/loyalty.service";
const auth = {
  tenantId: "t1",
  userId: "u1",
  branchId: "b1",
  requestId: "req",
  ipAddress: "ip",
} as any;
const tier = {
  id: "tier1",
  name: "Gold",
  discountPercent: "10.00",
  discountFixed: null,
};
const customer = {
  id: "c1",
  name: " Alice ",
  email: "a@x.com",
  phone: "111",
  loyaltyTierId: null,
  organizationCustomerId: null,
};
describe("loyaltyService comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    r.listApplicableTiers.mockResolvedValue([tier]);
    r.findApplicableTier.mockResolvedValue(tier);
    r.findTier.mockResolvedValue(tier);
    r.createTier.mockResolvedValue(tier);
    r.updateTier.mockResolvedValue(tier);
    r.listCustomers.mockResolvedValue([customer]);
    r.findCustomer.mockResolvedValue(customer);
    r.findOrganizationCustomerIdentity.mockResolvedValue("identity");
    r.createCustomer.mockResolvedValue(customer);
    r.setOrganizationCustomerIdentity.mockResolvedValue(customer);
    r.updateCustomer.mockResolvedValue(customer);
  });
  it("lists tiers and customers with read permission", async () => {
    await expect(loyaltyService.listTiers(auth)).resolves.toEqual([tier]);
    await expect(loyaltyService.listCustomers(auth)).resolves.toEqual([
      customer,
    ]);
    expect(authMocks.requirePermission).toHaveBeenCalledWith(auth, "menu:read");
  });
  it("validates exactly one discount type and all numeric bounds", async () => {
    for (const input of [
      { name: "X" },
      { name: "X", discountPercent: 10, discountFixed: 5 },
      { name: "X", discountPercent: 0 },
      { name: "X", discountPercent: 101 },
      { name: "X", discountFixed: 0 },
    ] as any[])
      await expect(loyaltyService.createTier(auth, input)).rejects.toThrow();
  });
  it("creates percent and fixed tiers with normalization and audit", async () => {
    await loyaltyService.createTier(auth, {
      name: " Gold ",
      discountPercent: 12.5,
    });
    expect(r.createTier).toHaveBeenLastCalledWith({
      tenantId: "t1",
      name: "Gold",
      discountPercent: "12.50",
      discountFixed: null,
    });
    r.createTier.mockResolvedValue({
      ...tier,
      id: "t2",
      discountPercent: null,
      discountFixed: "5.00",
    });
    await loyaltyService.createTier(auth, {
      name: " Fixed ",
      discountFixed: 5,
    });
    expect(r.createTier).toHaveBeenLastCalledWith({
      tenantId: "t1",
      name: "Fixed",
      discountPercent: null,
      discountFixed: "5.00",
    });
    expect(authMocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOYALTY_TIER_CREATED" }),
    );
  });
  it("rejects missing tier updates and repository races", async () => {
    r.findTier.mockResolvedValue(undefined);
    await expect(
      loyaltyService.updateTier(auth, "x", { name: "N" }),
    ).rejects.toThrow("Loyalty tier not found");
    r.findTier.mockResolvedValue(tier);
    r.updateTier.mockResolvedValue(undefined);
    await expect(
      loyaltyService.updateTier(auth, "tier1", { name: "N" }),
    ).rejects.toThrow("Loyalty tier not found");
  });
  it("merges existing percentage and explicit fixed/percent tier patches", async () => {
    await loyaltyService.updateTier(auth, "tier1", { name: " New " });
    expect(r.updateTier).toHaveBeenLastCalledWith("t1", "tier1", {
      name: "New",
      discountPercent: "10.00",
      discountFixed: null,
    });
    r.findTier.mockResolvedValue({
      ...tier,
      discountPercent: null,
      discountFixed: "7.50",
    });
    await loyaltyService.updateTier(auth, "tier1", {
      name: " Fixed existing ",
    });
    expect(r.updateTier).toHaveBeenLastCalledWith("t1", "tier1", {
      name: "Fixed existing",
      discountPercent: null,
      discountFixed: "7.50",
    });
    await loyaltyService.updateTier(auth, "tier1", { discountFixed: 8 });
    expect(r.updateTier).toHaveBeenLastCalledWith(
      "t1",
      "tier1",
      expect.objectContaining({ discountFixed: "8.00", discountPercent: null }),
    );
    r.findTier.mockResolvedValue({
      ...tier,
      discountPercent: null,
      discountFixed: "7.50",
    });
    await loyaltyService.updateTier(auth, "tier1", {
      discountPercent: 20,
      discountFixed: null,
    });
    expect(r.updateTier).toHaveBeenLastCalledWith(
      "t1",
      "tier1",
      expect.objectContaining({
        discountPercent: "20.00",
        discountFixed: null,
      }),
    );
    expect(authMocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOYALTY_TIER_UPDATED" }),
    );
  });
  it("removes tiers and audits", async () => {
    await loyaltyService.removeTier(auth, "tier1");
    expect(r.removeTier).toHaveBeenCalledWith("t1", "tier1");
    expect(authMocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LOYALTY_TIER_DELETED" }),
    );
  });
  it("rejects a foreign customer tier", async () => {
    r.findApplicableTier.mockResolvedValue(undefined);
    await expect(
      loyaltyService.createCustomer(auth, { name: "A", loyaltyTierId: "bad" }),
    ).rejects.toThrow("does not belong");
  });
  it("creates customers with no phone, existing identity, and first identity fallback", async () => {
    await loyaltyService.createCustomer(auth, {
      name: " Alice ",
      email: " a@x.com ",
      phone: "   ",
      loyaltyTierId: null,
    });
    expect(r.createCustomer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Alice",
        email: "a@x.com",
        phone: null,
        organizationCustomerId: null,
        loyaltyTierId: null,
      }),
    );
    await loyaltyService.createCustomer(auth, { name: "A", phone: " 111 " });
    expect(r.createCustomer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phone: "111",
        organizationCustomerId: "identity",
      }),
    );
    r.findOrganizationCustomerIdentity.mockResolvedValue(null);
    r.createCustomer.mockResolvedValue({
      ...customer,
      organizationCustomerId: null,
    });
    r.setOrganizationCustomerIdentity.mockResolvedValue(undefined);
    await expect(
      loyaltyService.createCustomer(auth, { name: "A", phone: "222" }),
    ).resolves.toMatchObject({ id: "c1" });
    expect(r.setOrganizationCustomerIdentity).toHaveBeenCalledWith(
      "t1",
      "c1",
      "c1",
    );
  });
  it("rejects missing customer and invalid patched tier", async () => {
    r.findCustomer.mockResolvedValue(undefined);
    await expect(loyaltyService.updateCustomer(auth, "x", {})).rejects.toThrow(
      "Customer not found",
    );
    r.findCustomer.mockResolvedValue(customer);
    r.findApplicableTier.mockResolvedValue(undefined);
    await expect(
      loyaltyService.updateCustomer(auth, "c1", { loyaltyTierId: "bad" }),
    ).rejects.toThrow("does not belong");
  });
  it("normalizes all customer patch fields and identity fallbacks", async () => {
    r.findCustomer.mockResolvedValue({
      ...customer,
      organizationCustomerId: "existing-id",
    });
    r.findOrganizationCustomerIdentity.mockResolvedValue(null);
    await loyaltyService.updateCustomer(auth, "c1", {
      name: " Bob ",
      email: " ",
      phone: " 333 ",
      loyaltyTierId: null,
    });
    expect(r.updateCustomer).toHaveBeenLastCalledWith("t1", "c1", {
      name: "Bob",
      email: null,
      phone: "333",
      organizationCustomerId: "existing-id",
      loyaltyTierId: null,
    });
    r.findCustomer.mockResolvedValue({
      ...customer,
      organizationCustomerId: null,
    });
    await loyaltyService.updateCustomer(auth, "c1", { phone: "444" });
    expect(r.updateCustomer).toHaveBeenLastCalledWith(
      "t1",
      "c1",
      expect.objectContaining({ organizationCustomerId: "c1" }),
    );
    await loyaltyService.updateCustomer(auth, "c1", {
      phone: null,
      email: null,
    });
    expect(r.updateCustomer).toHaveBeenLastCalledWith(
      "t1",
      "c1",
      expect.objectContaining({
        phone: null,
        organizationCustomerId: null,
        email: null,
      }),
    );
    await loyaltyService.updateCustomer(auth, "c1", {});
    expect(r.updateCustomer).toHaveBeenLastCalledWith("t1", "c1", {});
  });
  it("rejects an update race and audits successful customer updates", async () => {
    r.updateCustomer.mockResolvedValue(undefined);
    await expect(
      loyaltyService.updateCustomer(auth, "c1", { name: "B" }),
    ).rejects.toThrow("Customer not found");
    r.updateCustomer.mockResolvedValue(customer);
    await loyaltyService.updateCustomer(auth, "c1", { name: "B" });
    expect(authMocks.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CUSTOMER_LOYALTY_UPDATED" }),
    );
  });
});
