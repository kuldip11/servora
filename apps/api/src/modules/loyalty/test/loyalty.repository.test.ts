import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tenantFindFirst = vi.fn();
  const tierFindMany = vi.fn();
  const tierFindFirst = vi.fn();
  const customerFindMany = vi.fn();
  const customerFindFirst = vi.fn();
  const insertReturning = vi.fn();
  const insertValues = vi.fn();
  const updateReturning = vi.fn();
  const updateWhereResolved = vi.fn();
  const updateWhere = vi.fn();
  const updateSet = vi.fn();
  const deleteWhere = vi.fn();
  const selectLimit = vi.fn();
  const selectWhere = vi.fn();
  const selectInnerJoin = vi.fn();
  const selectFrom = vi.fn();
  const select = vi.fn();
  const insert = vi.fn();
  const update = vi.fn();
  const del = vi.fn();
  return {
    tenantFindFirst,
    tierFindMany,
    tierFindFirst,
    customerFindMany,
    customerFindFirst,
    insertReturning,
    insertValues,
    updateReturning,
    updateWhereResolved,
    updateWhere,
    updateSet,
    deleteWhere,
    selectLimit,
    selectWhere,
    selectInnerJoin,
    selectFrom,
    select,
    insert,
    update,
    del,
  };
});

vi.mock("../../../db", () => {
  const makeWhereResult = () => ({
    returning: m.updateReturning,
    then: (
      resolve: (value: unknown) => void,
      reject: (reason?: unknown) => void,
    ) => Promise.resolve(m.updateWhereResolved()).then(resolve, reject),
  });
  m.updateWhere.mockImplementation(() => makeWhereResult());
  m.updateSet.mockImplementation(() => ({ where: m.updateWhere }));
  m.update.mockImplementation(() => ({ set: m.updateSet }));
  m.insertValues.mockImplementation(() => ({ returning: m.insertReturning }));
  m.insert.mockImplementation(() => ({ values: m.insertValues }));
  m.del.mockImplementation(() => ({ delete: true, where: m.deleteWhere }));

  let selectedRows: unknown[] = [];
  const whereResult = {
    limit: m.selectLimit,
    then: (
      resolve: (value: unknown) => void,
      reject: (reason?: unknown) => void,
    ) => Promise.resolve(selectedRows).then(resolve, reject),
  };
  m.selectWhere.mockImplementation(() => whereResult);
  m.selectInnerJoin.mockImplementation(() => ({ where: m.selectWhere }));
  m.selectFrom.mockImplementation(() => ({ innerJoin: m.selectInnerJoin }));
  m.select.mockImplementation(() => ({ from: m.selectFrom }));

  return {
    db: {
      query: {
        tenants: { findFirst: m.tenantFindFirst },
        customerLoyaltyTiers: {
          findMany: m.tierFindMany,
          findFirst: m.tierFindFirst,
        },
        customers: {
          findMany: m.customerFindMany,
          findFirst: m.customerFindFirst,
        },
      },
      insert: m.insert,
      update: m.update,
      delete: m.del,
      select: m.select,
      __setSelectedRows: (rows: unknown[]) => {
        selectedRows = rows;
      },
    },
  };
});

import { db } from "@/db";
import { loyaltyRepository } from "@/modules/loyalty/loyalty.repository";

const setSelectedRows = (rows: unknown[]) =>
  (
    db as unknown as { __setSelectedRows(rows: unknown[]): void }
  ).__setSelectedRows(rows);
const tier = {
  id: "tier-1",
  tenantId: "t1",
  organizationId: null,
  name: "Gold",
  discountPercent: "10.00",
  discountFixed: null,
} as any;
const customer = {
  id: "c1",
  tenantId: "t1",
  name: "A",
  email: null,
  phone: "111",
  loyaltyTierId: null,
  organizationCustomerId: null,
  loyaltyTier: null,
} as any;

describe("loyaltyRepository comprehensive coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.tenantFindFirst.mockResolvedValue({ organizationId: "org-1" });
    m.tierFindMany.mockImplementation(async (options?: any) => {
      options?.orderBy?.({ name: "name" }, { asc: (value: unknown) => value });
      return [tier];
    });
    m.tierFindFirst.mockResolvedValue(tier);
    m.customerFindMany.mockImplementation(async (options?: any) => {
      options?.orderBy?.({ name: "name" }, { asc: (value: unknown) => value });
      return [customer];
    });
    m.customerFindFirst.mockResolvedValue(customer);
    m.insertReturning.mockResolvedValue([tier]);
    m.updateReturning.mockResolvedValue([tier]);
    m.updateWhereResolved.mockReturnValue(undefined);
    m.deleteWhere.mockResolvedValue(undefined);
    m.selectLimit.mockResolvedValue([]);
    setSelectedRows([]);
  });

  it("lists and finds applicable tiers with and without organization scope", async () => {
    await expect(loyaltyRepository.listApplicableTiers("t1")).resolves.toEqual([
      tier,
    ]);
    await expect(
      loyaltyRepository.findApplicableTier("t1", "tier-1"),
    ).resolves.toBe(tier);
    m.tenantFindFirst.mockResolvedValue({ organizationId: null });
    await loyaltyRepository.listApplicableTiers("t1");
    await loyaltyRepository.findApplicableTier("t1", "tier-1");
    expect(m.tierFindMany).toHaveBeenCalledTimes(2);
    expect(m.tierFindFirst).toHaveBeenCalledTimes(2);
  });

  it("covers tenant tier CRUD and customer reads", async () => {
    expect(await loyaltyRepository.listTiers("t1")).toEqual([tier]);
    expect(await loyaltyRepository.findTier("t1", "tier-1")).toBe(tier);
    expect(
      await loyaltyRepository.createTier({
        tenantId: "t1",
        name: "Gold",
        discountPercent: "10.00",
      } as any),
    ).toBe(tier);
    expect(
      await loyaltyRepository.updateTier("t1", "tier-1", { name: "G" } as any),
    ).toBe(tier);
    await loyaltyRepository.removeTier("t1", "tier-1");
    expect(await loyaltyRepository.listCustomers("t1")).toEqual([customer]);
    expect(await loyaltyRepository.findCustomer("t1", "c1")).toBe(customer);
    expect(m.insertValues).toHaveBeenCalled();
    expect(m.updateSet).toHaveBeenCalled();
    expect(m.deleteWhere).toHaveBeenCalled();
  });

  it("finds organization tier for a customer and handles every early exit", async () => {
    m.customerFindFirst.mockResolvedValueOnce(undefined);
    await expect(
      loyaltyRepository.findOrganizationTierForCustomer("t1", "missing"),
    ).resolves.toBeUndefined();

    m.customerFindFirst.mockResolvedValueOnce(customer);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: null });
    await expect(
      loyaltyRepository.findOrganizationTierForCustomer("t1", "c1"),
    ).resolves.toBeUndefined();

    m.customerFindFirst.mockResolvedValueOnce(customer);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    setSelectedRows([]);
    await expect(
      loyaltyRepository.findOrganizationTierForCustomer("t1", "c1"),
    ).resolves.toBeUndefined();

    const orgTier = { ...tier, organizationId: "org-1" };
    m.customerFindFirst.mockResolvedValueOnce({
      ...customer,
      organizationCustomerId: "identity",
      phone: null,
    });
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    setSelectedRows([{ id: "c1" }, { id: "c2" }]);
    m.customerFindMany.mockResolvedValueOnce([
      { ...customer, loyaltyTier: null },
      { ...customer, id: "c2", loyaltyTier: orgTier },
    ]);
    await expect(
      loyaltyRepository.findOrganizationTierForCustomer("t1", "c1"),
    ).resolves.toEqual(orgTier);

    m.customerFindFirst.mockResolvedValueOnce({
      ...customer,
      organizationCustomerId: null,
      phone: null,
    });
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    setSelectedRows([{ id: "c1" }]);
    m.customerFindMany.mockResolvedValueOnce([
      { ...customer, loyaltyTier: null },
    ]);
    await expect(
      loyaltyRepository.findOrganizationTierForCustomer("t1", "c1"),
    ).resolves.toBeUndefined();
  });

  it("covers organization tier CRUD", async () => {
    const orgTier = { ...tier, organizationId: "org-1", tenantId: null };
    m.tierFindMany.mockImplementationOnce(async (options?: any) => {
      options?.orderBy?.({ name: "name" }, { asc: (value: unknown) => value });
      return [orgTier];
    });
    m.insertReturning.mockResolvedValueOnce([orgTier]);
    m.tierFindFirst.mockResolvedValueOnce(orgTier);
    m.updateReturning.mockResolvedValueOnce([orgTier]);
    expect(await loyaltyRepository.listOrganizationTiers("org-1")).toEqual([
      orgTier,
    ]);
    expect(
      await loyaltyRepository.createOrganizationTier("org-1", {
        name: "Org",
        discountPercent: "5.00",
      } as any),
    ).toEqual(orgTier);
    expect(
      await loyaltyRepository.findOrganizationTier("org-1", "tier-1"),
    ).toEqual(orgTier);
    expect(
      await loyaltyRepository.updateOrganizationTier("org-1", "tier-1", {
        name: "Updated",
      } as any),
    ).toEqual(orgTier);
    await loyaltyRepository.removeOrganizationTier("org-1", "tier-1");
    expect(m.deleteWhere).toHaveBeenCalled();
  });

  it("returns local phone matches and short-circuits an empty phone", async () => {
    m.customerFindMany.mockResolvedValueOnce([customer]);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([customer]);
    m.customerFindMany.mockResolvedValueOnce([]);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", ""),
    ).resolves.toEqual([]);
    expect(m.tenantFindFirst).not.toHaveBeenCalled();
  });

  it("handles missing organization and ambiguous/no sibling phone matches", async () => {
    m.customerFindMany.mockResolvedValue([]);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: null });
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([]);

    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([]);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([]);

    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([]);
  });

  it("materializes sibling identity, preserves existing identity, and handles concurrent creation", async () => {
    m.customerFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([
      {
        id: "s1",
        tenantId: "t2",
        name: "Sibling",
        email: "s@x",
        phone: "111",
        organizationCustomerId: null,
      },
    ]);
    m.insertReturning.mockResolvedValueOnce([{ ...customer, id: "created" }]);
    m.customerFindFirst.mockResolvedValueOnce({ ...customer, id: "created" });
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([{ ...customer, id: "created" }]);
    expect(m.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ organizationCustomerId: "s1" }),
    );

    m.customerFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...customer, id: "concurrent" }]);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([
      {
        id: "s1",
        tenantId: "t2",
        name: "Sibling",
        email: null,
        phone: "111",
        organizationCustomerId: "identity",
      },
    ]);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([{ ...customer, id: "concurrent" }]);
  });

  it("handles insert race and hydration miss/success after sibling materialization", async () => {
    m.customerFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([
      {
        id: "s1",
        tenantId: "t2",
        name: "Sibling",
        email: null,
        phone: "111",
        organizationCustomerId: "identity",
      },
    ]);
    m.insertReturning.mockResolvedValueOnce([]);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([]);

    m.customerFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([
      {
        id: "s1",
        tenantId: "t2",
        name: "Sibling",
        email: null,
        phone: "111",
        organizationCustomerId: "identity",
      },
    ]);
    m.insertReturning.mockResolvedValueOnce([{ ...customer, id: "created" }]);
    m.customerFindFirst.mockResolvedValueOnce(undefined);
    await expect(
      loyaltyRepository.findCustomersByPhone("t1", "111"),
    ).resolves.toEqual([]);
  });

  it("finds or seeds organization customer identities", async () => {
    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: null });
    await expect(
      loyaltyRepository.findOrganizationCustomerIdentity("t1", "111"),
    ).resolves.toBeNull();

    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([]);
    await expect(
      loyaltyRepository.findOrganizationCustomerIdentity("t1", "111"),
    ).resolves.toBeNull();

    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([
      { id: "s1", tenantId: "t2", organizationCustomerId: null },
    ]);
    await expect(
      loyaltyRepository.findOrganizationCustomerIdentity("t1", "111"),
    ).resolves.toBe("s1");
    expect(m.updateSet).toHaveBeenLastCalledWith(
      expect.objectContaining({ organizationCustomerId: "s1" }),
    );

    m.tenantFindFirst.mockResolvedValueOnce({ organizationId: "org-1" });
    m.selectLimit.mockResolvedValueOnce([
      { id: "s1", tenantId: "t2", organizationCustomerId: "identity" },
    ]);
    await expect(
      loyaltyRepository.findOrganizationCustomerIdentity("t1", "111"),
    ).resolves.toBe("identity");
  });

  it("covers customer identity setter and customer create/update", async () => {
    m.updateReturning.mockResolvedValueOnce([customer]);
    expect(
      await loyaltyRepository.setOrganizationCustomerIdentity(
        "t1",
        "c1",
        "identity",
      ),
    ).toBe(customer);
    m.insertReturning.mockResolvedValueOnce([customer]);
    expect(
      await loyaltyRepository.createCustomer({
        tenantId: "t1",
        name: "A",
      } as any),
    ).toBe(customer);
    m.updateReturning.mockResolvedValueOnce([customer]);
    expect(
      await loyaltyRepository.updateCustomer("t1", "c1", { name: "B" } as any),
    ).toBe(customer);
  });
});
