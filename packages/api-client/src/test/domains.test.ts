import { describe, expect, it, vi } from "vitest";
import { createAnalyticsApi } from "../domains/analytics";
import { createApprovalsApi } from "../domains/approvals";
import { createAuditApi } from "../domains/audit";
import { createAuthApi } from "../domains/auth";
import { createAvailabilityApi } from "../domains/availability";
import { createBillingApi } from "../domains/billing";
import { createBranchesApi } from "../domains/branches";
import { createCustomersApi } from "../domains/customers";
import { createInventoryApi } from "../domains/inventory";
import { createKitchenApi } from "../domains/kitchen";
import { createMenuApi } from "../domains/menu";
import { createOrdersApi } from "../domains/orders";
import { createOrganizationsApi } from "../domains/organizations";
import { createSettingsApi } from "../domains/settings";
import {
  deleteDomainData,
  getDomainData,
  getPaginatedDomainData,
  patchDomainData,
  postDomainData,
  putDomainData,
  type DomainHttpClient,
} from "../domains/shared";
import { createStaffApi } from "../domains/staff";
import { createTablesApi } from "../domains/tables";

const makeClient = () => {
  const response = {
    data: {
      data: { ok: true },
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    },
  };
  const method = vi.fn().mockResolvedValue(response);
  return {
    client: {
      get: vi.fn().mockResolvedValue(response),
      post: vi.fn().mockResolvedValue(response),
      put: vi.fn().mockResolvedValue(response),
      patch: vi.fn().mockResolvedValue(response),
      delete: vi.fn().mockResolvedValue(response),
    } as unknown as DomainHttpClient,
    method,
  };
};

const invokeAll = async (
  api: Record<string, (...args: never[]) => unknown>,
) => {
  for (const fn of Object.values(api)) {
    await fn();
  }
};

describe("domain shared helpers", () => {
  it("unwraps data for every HTTP verb and supports optional config/body branches", async () => {
    const { client } = makeClient();
    await expect(getDomainData(client, "/a")).resolves.toEqual({ ok: true });
    await expect(
      getDomainData(client, "/a", { params: { q: 1 } }),
    ).resolves.toEqual({ ok: true });
    await expect(getPaginatedDomainData(client, "/p")).resolves.toEqual({
      items: { ok: true },
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    });
    await getPaginatedDomainData(client, "/p", { params: { page: 2 } });
    await postDomainData(client, "/post");
    await postDomainData(client, "/post", { a: 1 });
    await postDomainData(client, "/post", { a: 1 }, { headers: { x: "y" } });
    await putDomainData(client, "/put");
    await putDomainData(client, "/put", { a: 1 });
    await putDomainData(client, "/put", { a: 1 }, { params: { q: 1 } });
    await patchDomainData(client, "/patch");
    await patchDomainData(client, "/patch", { a: 1 });
    await patchDomainData(client, "/patch", { a: 1 }, { params: { q: 1 } });
    await deleteDomainData(client, "/delete");
    await deleteDomainData(client, "/delete", { params: { hard: true } });

    expect(client.get).toHaveBeenCalled();
    expect(client.post).toHaveBeenCalled();
    expect(client.put).toHaveBeenCalled();
    expect(client.patch).toHaveBeenCalled();
    expect(client.delete).toHaveBeenCalled();
  });
});

describe("small domain APIs", () => {
  it("covers analytics, approvals, audit, availability, settings, kitchen, branches and tables", async () => {
    const { client } = makeClient();
    await invokeAll(createAnalyticsApi(client) as never);
    await invokeAll(createAuditApi(client) as never);
    await invokeAll(createSettingsApi(client) as never);
    await createApprovalsApi(client).requestManagerApproval({
      actionType: "VOID",
      orderId: "o1",
      orderItemId: "i1",
      managerEmail: "m@example.com",
      password: "secret",
    });
    await createApprovalsApi(client).listThresholds();
    await createApprovalsApi(client).setThreshold("VOID", { amount: 10 });
    await createAvailabilityApi(client).dashboard({
      channel: "STAFF",
      fulfillmentType: "DINE_IN",
    });

    const kitchen = createKitchenApi(client);
    await kitchen.tickets();
    await kitchen.tickets("station-1");
    await kitchen.stations();
    await kitchen.updateTicketStatus("ticket-1", "READY");

    const branches = createBranchesApi(client);
    await branches.list();
    await branches.create({
      name: "Main",
      code: "MAIN",
      timezone: "Asia/Kolkata",
      currency: "INR",
      dineInEnabled: true,
      takeawayEnabled: true,
      deliveryEnabled: false,
      onlineEnabled: false,
      tablesEnabled: true,
    });
    await branches.update("b1", { name: "Updated" });
    await branches.deactivate("b1");

    const tables = createTablesApi(client);
    await tables.list();
    await tables.create({ name: "T1", capacity: 4 });
    await tables.update("t1", { name: "T2" });
    await tables.updateStatus("t1", "OCCUPIED");
    await tables.remove("t1");
    await tables.regenerateQr("t1");
    await tables.getTakeawayQr("b1");
    await tables.regenerateTakeawayQr("b1");
  });
});

describe("auth, billing, customer, inventory and staff APIs", () => {
  it("executes their public request wrappers including filter branches", async () => {
    const { client } = makeClient();
    const auth = createAuthApi(client);
    await auth.signup({
      firstName: "A",
      lastName: "B",
      email: "a@b.com",
      password: "secret",
    });
    await auth.login({ email: "a@b.com", password: "secret" });
    await auth.refresh();
    await auth.logout();
    await auth.memberships();
    await auth.organizations();
    await auth.createOrganization("Org");
    await auth.createOrganization({ name: "Org 2" });
    await auth.createTenant("Tenant", "org-1");
    await auth.createTenant({ name: "Tenant 2" });
    await auth.updateTenant("t1", { name: "T" });
    await auth.archiveTenant("t1");
    await auth.me();
    await auth.updateProfile({ displayName: "Chef" });
    await auth.changePassword({ currentPassword: "old", newPassword: "new" });
    await auth.listTenants();

    const billing = createBillingApi(client);
    await billing.collectPayment({ orderId: "o1", method: "CASH", amount: 10 });
    await billing.getOrderBills("o1");
    await billing.splitOrder("o1", 2);
    await billing.splitOrderByItems("o1", [
      { label: "A", orderItemIds: ["i1"] },
    ]);
    await billing.splitOrderBySeat("o1", "EVEN_SPLIT");

    const customers = createCustomersApi(client);
    await customers.list();
    await customers.search();
    await customers.create({ name: "Guest" });
    await customers.assignTier("c1", null);
    await customers.listGroups();
    await customers.createGroup({ name: "VIP" });
    await customers.updateGroup("g1", { name: "VIP+" });
    await customers.deleteGroup("g1");
    await customers.resolveRequest("r1");
    await customers.listRequests();

    const inventory = createInventoryApi(client);
    await inventory.list();
    await inventory.list({
      page: 2,
      limit: 10,
      search: "rice",
      lowStockOnly: true,
    });
    await inventory.lowStock();
    await inventory.create({ name: "Rice", unit: "KG" } as never);
    await inventory.recipeImpact("i1");
    await inventory.transactions();
    await inventory.updateStock("i1", { quantity: 2, type: "IN" } as never);
    await inventory.wasteReasons();
    await inventory.createWasteReason("Spillage");
    await inventory.logWaste("i1", { quantity: 1, wasteReasonId: "w1" });

    const staff = createStaffApi(client);
    await staff.listStaff();
    await staff.listStaff({
      page: 2,
      limit: 10,
      search: "sam",
      status: "ACTIVE",
    });
    await staff.addStaff({
      firstName: "Sam",
      lastName: "One",
      email: "s@e.com",
      password: "secret",
      roleId: "r1",
      branchIds: ["b1"],
    });
    await staff.removeStaff("s1");
    await staff.updateStaffStatus("s1", "INACTIVE");
    await staff.updateStaff("s1", { firstName: "Samuel" });
    await staff.listRoles();
    await staff.createRole({ name: "Runner", scope: "BRANCH" });
    await staff.updateRole("r1", { name: "Runner 2" });
    await staff.archiveRole("r1");
    await staff.listPermissions();
    await staff.permissionsForRole("r1");
    await staff.setPermissionsForRole("r1", ["p1"]);
  });
});

describe("orders and organizations APIs", () => {
  it("covers order lifecycle wrappers and organization management", async () => {
    const { client } = makeClient();
    const orders = createOrdersApi(client);
    await orders.list();
    await orders.list({
      page: 2,
      limit: 5,
      search: "42",
      status: "OPEN",
      type: "DINE_IN",
      view: "READY",
      sortBy: "createdAt",
      sortDirection: "desc",
    });
    await orders.list({ view: "ALL" });
    await orders.get("o1");
    await orders.create({} as never);
    await orders.addItems("o1", {} as never);
    await orders.updateStatus("o1", {} as never);
    await orders.updateTicketStatus("k1", {} as never);
    await orders.refireItem("o1", "i1", "cold");
    await orders.refireItem("o1", "i1", "cold", false);
    await orders.refillItem("o1", "i1");
    await orders.voidItem("o1", "i1", { reason: "mistake" } as never);
    await orders.compItem("o1", "i1", { reason: "service" } as never);
    await orders.transferTable("o1", "t2");
    await orders.transferTable("o1", "t3", "  guest moved  ");
    await orders.merge("o1", "o2");
    await orders.listCancellationReasons();
    await orders.setItemSeatShares("o1", "i1", [
      { seatLabel: "A", shareRatio: 1 },
    ]);
    await orders.listAllCancellationReasons();
    await orders.createCancellationReason("Guest left");
    await orders.updateCancellationReason("c1", { label: "Updated" });
    await orders.explain("o1");

    const organizations = createOrganizationsApi(client);
    await organizations.list();
    await organizations.tenants("org1");
    await organizations.create({ name: "Org" });
    await organizations.update("org1", { name: "Org 2" });
    await organizations.archive("org1");
    await organizations.menus("org1");
    await organizations.createMenu("org1", { name: "Dinner" });
    await organizations.updateMenu("org1", "m1", { name: "Dinner 2" });
    await organizations.removeMenu("org1", "m1");
    await organizations.loyaltyTiers("org1");
    await organizations.createLoyaltyTier("org1", { name: "Gold" });
    await organizations.removeLoyaltyTier("org1", "l1");
  });
});

describe("menu API", () => {
  it("executes the full menu-management request surface", async () => {
    const { client } = makeClient();
    const api = createMenuApi(client);
    await api.listCategories();
    await api.listOrderableCategories();
    await api.createCategory("Drinks");
    await api.renameCategory("c1", "Beverages");
    await api.deleteCategory("c1");
    await api.createItem({} as never);
    await api.updateItem("i1", {} as never);
    await api.setManualStockCount("i1", 3);
    await api.setManualStockCount("i1", 3, "v1");
    await api.setManualAvailabilityOverride("i1", "OUT_OF_STOCK", "sold out");
    await api.clearManualAvailabilityOverride("i1");
    await api.deleteItem("i1");
    await api.duplicateItem("i1");
    await api.setPublished("i1", true);
    await api.setPublished("i1", false);
    await api.bulkSetStatus(["i1"], "ACTIVE", "ready");
    await api.bulkMoveCategory(["i1"], "c2");
    await api.bulkUpdateTags(["i1"], ["t1"], "replace");
    await api.bulkAdjustPrice(["i1"], 10, "increase");
    await api.bulkDelete(["i1"]);
    await api.listMenus();
    await api.createMenu({ name: "Dinner" });
    await api.updateMenu("m1", {
      availableChannels: [],
      availableFulfillmentTypes: [],
      availableBranchIds: [],
    });
    await api.publishMenu("m1");
    await api.unpublishMenu("m1");
    await api.removeMenu("m1");
    await api.assignItemToMenu("i1", { menuId: "m1", categoryId: "c1" });
    await api.removeItemFromMenu("i1", "m1");
    await api.listKitchenStations();
    await api.createKitchenStation({ name: "Hot" });
    await api.removeKitchenStation("s1");
    await api.listStationRoutes("i1");
    await api.setStationRoute("i1", "s1");
    await api.removeStationRoute("i1");
    await api.removeStationRoute("i1", "mo1");
    await api.listModifierGroups();
    await api.saveModifierGroup(null, {} as never);
    await api.saveModifierGroup("g1", {} as never);
    await api.removeModifierGroup("g1");
    await api.listTemplates();
    await api.removeTemplate("t1");
    await api.applyTemplate("t1", {});
    await api.saveTemplateFromCategory("c1", { name: "Template" });
    await api.listSubRecipes();
    await api.createSubRecipe({} as never);
    await api.updateSubRecipe("s1", {} as never);
    await api.removeSubRecipe("s1");
    await api.listTags();
    await api.createTag("Spicy", "#f00");
    await api.removeTag("t1");
    await api.listSchedules("i1");
    await api.addSchedule("i1", {
      scheduleType: "DAILY",
      statusDuringPeriod: "ACTIVE",
      startTime: "09:00",
      endTime: "17:00",
    } as never);
    await api.addSchedule("i1", {
      scheduleType: "WEEKLY",
      statusDuringPeriod: "ACTIVE",
      startTime: "09:00",
      endTime: "17:00",
      dayOfWeek: 1,
    } as never);
    await api.addSchedule("i1", {
      scheduleType: "SPECIFIC_DATE",
      statusDuringPeriod: "ACTIVE",
      startDate: "2026-09-04",
    } as never);
    await api.addSchedule("i1", {
      scheduleType: "HOLIDAY",
      statusDuringPeriod: "ACTIVE",
      holidayName: "Diwali",
    } as never);
    await api.removeSchedule("sc1");
    await api.listHolidays();
    await api.addHoliday({ name: "Holiday", holidayDate: "2026-10-01" });
    await api.removeHoliday("h1");
    await api.listBranchOverrides("i1");
    await api.saveBranchOverride("i1", "b1", {} as never);
    await api.resetBranchOverride("i1", "b1");
    await api.listActiveMenus("DINE_IN");
    await api.listCombos();
    await api.listPromotions();
    await api.listPriceRules();
    await api.listAllergens();
    await api.getItemRecipes("i1");
    await api.saveItemRecipes("i1", []);
    const form = new FormData();
    await api.downloadImportTemplate("csv");
    await api.validateImport(form);
    await api.commitImport(form);
    await api.exportEntity("items", "xlsx");
    await api.listPromotionsFor();
    await api.promotionStats("p1");
    await api.createPromotion({ name: "Promo" });
    await api.updatePromotion("p1", { name: "Promo 2" });
    await api.removePromotion("p1");
    await api.previewPromotion({});
    await api.createCombo({});
    await api.updateCombo("c1", {});
    await api.removeCombo("c1");
    await api.previewCombo({});
    await api.listChannelOverrides("i1");
    await api.saveChannelOverride("i1", {});
    await api.removeChannelOverride("co1");
    await api.listPriceRulesFor({ channel: "STAFF" });
    await api.createPriceRule({});
    await api.removePriceRule("pr1");
    await api.createHappyHourRule({});
    await api.listLoyaltyTiers();
    await api.createLoyaltyTier({});
    await api.removeLoyaltyTier("lt1");
    await api.listMenuSchedules("m1");
    await api.createMenuSchedule("m1", {});
    await api.removeMenuSchedule("ms1");
    await api.updateVariantAvailability("v1", { status: null, reason: null });
    await api.updateModifierGroup("g1", {});

    expect(client.get).toHaveBeenCalled();
    expect(client.post).toHaveBeenCalled();
    expect(client.put).toHaveBeenCalled();
    expect(client.patch).toHaveBeenCalled();
    expect(client.delete).toHaveBeenCalled();
  });
});
