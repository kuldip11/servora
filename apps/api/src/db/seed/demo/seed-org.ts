import bcrypt from "bcryptjs";
import { and, isNull, eq } from "drizzle-orm";
import type { SeedDatabase, DemoConfig, SeedContext } from "./types";
import {
  branches,
  globalUserRoles,
  membershipBranches,
  membershipRoles,
  organizationMemberships,
  organizations,
  roles,
  tenantMemberships,
  tenants,
  users,
} from "@/db/schema";
import { DEMO_EMAIL, DEMO_ORG_NAME, DEMO_PASSWORD, uuidFor } from "./utils";

const locations = [
  ["Mumbai", "Maharashtra", "400001"],
  ["Pune", "Maharashtra", "411001"],
  ["Bengaluru", "Karnataka", "560001"],
  ["Delhi", "Delhi", "110001"],
  ["Hyderabad", "Telangana", "500001"],
  ["Chennai", "Tamil Nadu", "600001"],
  ["Goa", "Goa", "403001"],
  ["Ahmedabad", "Gujarat", "380001"],
  ["Jaipur", "Rajasthan", "302001"],
  ["Kolkata", "West Bengal", "700001"],
] as const;
const firstNames = [
  "Aarav",
  "Diya",
  "Kabir",
  "Meera",
  "Rohan",
  "Priya",
  "Arjun",
  "Neha",
  "Vikram",
  "Ananya",
];
const lastNames = [
  "Sharma",
  "Patel",
  "Mehta",
  "Kapoor",
  "Rao",
  "Iyer",
  "Singh",
  "Gupta",
  "Nair",
  "Joshi",
];

export const seedOrganization = async (
  db: SeedDatabase,
  config: DemoConfig,
): Promise<SeedContext> => {
  const ownerUserId = uuidFor("user:owner");
  const organizationId = uuidFor("organization");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await db.insert(users).values({
    id: ownerUserId,
    firstName: "Servora",
    lastName: "Demo",
    displayName: "Servora Demo Owner",
    email: DEMO_EMAIL,
    phone: "+919900000001",
    passwordHash,
    status: "ACTIVE",
  });
  await db.insert(organizations).values({
    id: organizationId,
    name: DEMO_ORG_NAME,
    businessType: "RESTAURANT_GROUP",
    country: "IN",
    timezone: "Asia/Kolkata",
    currency: "INR",
    primaryContactName: "Servora Demo Owner",
    businessEmail: DEMO_EMAIL,
    businessPhone: "+919900000001",
    city: "Mumbai",
    stateProvince: "Maharashtra",
    legalName: "Servora Demo Hospitality Private Limited",
    gstin: "27ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    createdBy: ownerUserId,
  });
  await db.insert(organizationMemberships).values({
    id: uuidFor("org-membership:owner"),
    userId: ownerUserId,
    organizationId,
  });

  const systemRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(and(isNull(roles.tenantId), eq(roles.isSystem, true)));
  const roleByName = new Map(
    systemRoles.map((role) => [role.name.toUpperCase(), role.id]),
  );
  const requiredRoles = [
    "OWNER",
    "FRANCHISE_ADMIN",
    "MANAGER",
    "CHEF",
    "WAITER",
    "CASHIER",
  ];
  for (const role of requiredRoles)
    if (!roleByName.has(role))
      throw new Error(`Required migrated system role is missing: ${role}`);
  await db
    .insert(globalUserRoles)
    .values({ userId: ownerUserId, roleId: roleByName.get("OWNER")! });

  const tenantIds: Record<string, string> = {};
  const branchIds: Record<string, string[]> = {};
  const branchTenantIds: Record<string, string> = {};
  const staffUserIdsByBranch: Record<string, string[]> = {};

  for (const [brandIndex, brand] of config.brands.entries()) {
    const tenantId = uuidFor(`tenant:${brand.key}`);
    tenantIds[brand.key] = tenantId;
    branchIds[brand.key] = [];
    await db.insert(tenants).values({
      id: tenantId,
      organizationId,
      createdBy: ownerUserId,
      name: brand.name,
      displayName: brand.name,
      description: `${brand.name} — realistic Servora demonstration franchise`,
      cuisineTypes: brand.cuisineTypes,
      businessModel: brand.businessModel,
      defaultCurrency: "INR",
      defaultTimezone: "Asia/Kolkata",
      supportEmail: `${brand.key}@demo.servora.local`,
      plan: "enterprise",
      serviceChargePercent: brand.key === "qsr" ? "0" : "5.00",
      defaultTaxRate: "5.00",
      dineInEnabled: true,
      takeawayEnabled: true,
      deliveryEnabled: true,
      customerQrEnabled: true,
      tableManagementEnabled: true,
      kdsEnabled: true,
      waiterServiceEnabled: true,
    });

    const ownerMembershipId = uuidFor(`membership:owner:${brand.key}`);
    await db.insert(tenantMemberships).values({
      id: ownerMembershipId,
      userId: ownerUserId,
      tenantId,
      status: "ACTIVE",
    });
    await db.insert(membershipRoles).values({
      membershipId: ownerMembershipId,
      roleId: roleByName.get("FRANCHISE_ADMIN")!,
    });

    for (let branchIndex = 0; branchIndex < brand.branchCount; branchIndex++) {
      const location =
        locations[(brandIndex * 3 + branchIndex) % locations.length]!;
      const branchId = uuidFor(`branch:${brand.key}:${branchIndex}`);
      branchIds[brand.key]!.push(branchId);
      branchTenantIds[branchId] = tenantId;
      staffUserIdsByBranch[branchId] = [];
      const code = `${brand.key.slice(0, 3).toUpperCase()}${String(branchIndex + 1).padStart(2, "0")}`;
      await db.insert(branches).values({
        id: branchId,
        tenantId,
        name: `${location[0]} ${branchIndex + 1}`,
        code,
        address: `${10 + branchIndex}, Demo Business District, ${location[0]}, ${location[1]} ${location[2]}`,
        addressLine1: `${10 + branchIndex}, Demo Business District`,
        city: location[0],
        stateProvince: location[1],
        postalCode: location[2],
        country: "IN",
        phone: `+9198${brandIndex}${String(branchIndex).padStart(2, "0")}000001`,
        managerName: `${firstNames[(branchIndex + 2) % firstNames.length]} ${lastNames[(branchIndex + 4) % lastNames.length]}`,
        email: `${code.toLowerCase()}@demo.servora.local`,
        openingTime: brand.key === "bar" ? "12:00" : "08:00",
        closingTime: brand.key === "bar" ? "23:59" : "23:00",
        weeklyOperatingDays: [
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
          "SUNDAY",
        ],
        invoicePrefix: code,
        receiptFooter: "Thank you for visiting — Servora demo data",
        inventoryTrackingEnabled: true,
      });
      await db
        .insert(membershipBranches)
        .values({ membershipId: ownerMembershipId, tenantId, branchId });

      const branchRoleNames = ["MANAGER", "CHEF", "WAITER", "CASHIER"];
      for (
        let staffIndex = 0;
        staffIndex < config.staffPerBranch;
        staffIndex++
      ) {
        const userId = uuidFor(
          `staff:${brand.key}:${branchIndex}:${staffIndex}`,
        );
        const first =
          firstNames[(staffIndex + branchIndex) % firstNames.length]!;
        const last = lastNames[(staffIndex + brandIndex) % lastNames.length]!;
        const roleName = branchRoleNames[staffIndex % branchRoleNames.length]!;
        const membershipId = uuidFor(
          `staff-membership:${brand.key}:${branchIndex}:${staffIndex}`,
        );
        await db.insert(users).values({
          id: userId,
          firstName: first,
          lastName: last,
          displayName: `${first} ${last}`,
          email: `${brand.key}.${branchIndex + 1}.${roleName.toLowerCase()}.${staffIndex + 1}@demo.servora.local`,
          passwordHash,
          status: "ACTIVE",
        });
        await db
          .insert(tenantMemberships)
          .values({ id: membershipId, userId, tenantId, status: "ACTIVE" });
        await db
          .insert(membershipRoles)
          .values({ membershipId, roleId: roleByName.get(roleName)! });
        await db
          .insert(membershipBranches)
          .values({ membershipId, tenantId, branchId });
        staffUserIdsByBranch[branchId]!.push(userId);
      }
    }
  }

  return {
    organizationId,
    ownerUserId,
    tenantIds,
    branchIds,
    branchTenantIds,
    staffUserIdsByBranch,
  };
};
