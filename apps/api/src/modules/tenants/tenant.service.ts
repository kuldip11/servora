import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { tenantRepository } from "./tenant.repository";
import { branchRepository } from "@/modules/branches/branch.repository";
import { tenantNotFound } from "./tenant.errors";
import {
  ForbiddenError,
  ServiceUnavailableError,
  ValidationError,
} from "@/core/errors";
import { writeAudit } from "@/core/audit";

export const tenantService = {
  async list(auth: AuthContext) {
    const memberships = await tenantRepository.findMembershipsByUserId(
      auth.userId,
    );
    return Promise.all(
      memberships.map(async (membership) => {
        const tenantWide = membership.roles.some(
          (item) => item.role.scope === "TENANT",
        );
        const branchIds = tenantWide
          ? (await branchRepository.findMany(membership.tenant.id, null)).map(
              (branch) => branch.id,
            )
          : membership.branches.map((item) => item.branchId);

        return {
          membershipId: membership.id,
          tenant: membership.tenant,
          roles: membership.roles.map((item) => ({
            id: item.roleId,
            name: item.role.name,
            scope: item.role.scope,
          })),
          branchIds,
        };
      }),
    );
  },

  async create(
    auth: AuthContext,
    input: {
      name: string;
      organizationId: string;
      displayName?: string | null;
      description?: string | null;
      cuisineTypes?: string[];
      businessModel?: string | null;
      defaultCurrency?: string | null;
      defaultTimezone?: string | null;
      supportEmail?: string | null;
      supportPhone?: string | null;
      website?: string | null;
      logoUrl?: string | null;
      primaryBrandImageUrl?: string | null;
      defaultTaxMode?: "INCLUSIVE" | "EXCLUSIVE";
      defaultTaxRate?: number | null;
      dineInEnabled?: boolean;
      takeawayEnabled?: boolean;
      deliveryEnabled?: boolean;
      customerQrEnabled?: boolean;
      tableManagementEnabled?: boolean;
      kdsEnabled?: boolean;
      waiterServiceEnabled?: boolean;
    },
  ) {
    if (!auth.roles.includes("OWNER")) {
      throw new ForbiddenError("Only the global Owner can create tenants");
    }
    const organizationMembership =
      await tenantRepository.findOrganizationMembership(
        auth.userId,
        input.organizationId,
      );
    if (
      !organizationMembership ||
      !organizationMembership.organization.isActive
    ) {
      throw new ForbiddenError("Organization access denied");
    }

    const tenant = await tenantRepository.create({
      ...input,
      name: input.name.trim(),
      cuisineTypes: input.cuisineTypes ?? null,
      defaultCurrency: input.defaultCurrency?.trim().toUpperCase() || null,
      defaultTimezone: input.defaultTimezone?.trim() || null,
      supportEmail: input.supportEmail?.trim().toLowerCase() || null,
      defaultTaxRate:
        input.defaultTaxRate === undefined || input.defaultTaxRate === null
          ? null
          : input.defaultTaxRate.toFixed(2),
      createdBy: auth.userId,
      organizationId: input.organizationId,
    });
    const tenantRole = await tenantRepository.findRoleByName("FRANCHISE_ADMIN");
    if (!tenantRole || tenantRole.scope !== "TENANT")
      throw new ServiceUnavailableError(
        "RBAC reference data is unavailable: TENANT FRANCHISE_ADMIN role is missing",
      );
    const membership = await tenantRepository.createOwnerMembership(
      auth.userId,
      tenant.id,
      tenantRole.id,
    );
    await writeAudit({
      tenantId: tenant.id,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "TENANT_CREATED",
      entity: "tenant",
      entityId: tenant.id,
      metadata: { name: tenant.name },
    });
    return { tenant, membershipId: membership.id };
  },

  async update(
    auth: AuthContext,
    tenantId: string,
    changes: {
      name?: string;
      serviceChargePercent?: number | null;
      serviceChargeTaxable?: boolean;
      roundingPolicy?: "NONE" | "NEAREST_1" | "NEAREST_5" | "NEAREST_10";
      defaultTaxMode?: "INCLUSIVE" | "EXCLUSIVE";
      courseSequencingEnabled?: boolean;
      displayName?: string | null;
      description?: string | null;
      cuisineTypes?: string[] | null;
      businessModel?: string | null;
      defaultCurrency?: string | null;
      defaultTimezone?: string | null;
      supportEmail?: string | null;
      supportPhone?: string | null;
      website?: string | null;
      logoUrl?: string | null;
      primaryBrandImageUrl?: string | null;
      defaultTaxRate?: number | null;
      dineInEnabled?: boolean;
      takeawayEnabled?: boolean;
      deliveryEnabled?: boolean;
      customerQrEnabled?: boolean;
      tableManagementEnabled?: boolean;
      kdsEnabled?: boolean;
      waiterServiceEnabled?: boolean;
    },
  ) {
    requirePermission(auth, "tenant:update");
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) throw tenantNotFound(tenantId);
    const organizationMembership =
      await tenantRepository.findOrganizationMembership(
        auth.userId,
        tenant.organizationId,
      );
    if (!organizationMembership) throw tenantNotFound(tenantId);
    if (tenantId !== auth.tenantId) throw tenantNotFound(tenantId);
    if (
      changes.serviceChargePercent !== undefined &&
      changes.serviceChargePercent !== null &&
      (!Number.isFinite(changes.serviceChargePercent) ||
        changes.serviceChargePercent < 0 ||
        changes.serviceChargePercent > 100)
    ) {
      throw new ValidationError(
        "Service charge percent must be between 0 and 100",
      );
    }
    const {
      serviceChargePercent: _serviceChargePercent,
      defaultTaxRate: _defaultTaxRate,
      ...repositoryChanges
    } = changes;
    const updated = await tenantRepository.update(tenantId, {
      ...repositoryChanges,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.defaultCurrency !== undefined
        ? {
            defaultCurrency:
              changes.defaultCurrency?.trim().toUpperCase() || null,
          }
        : {}),
      ...(changes.defaultTimezone !== undefined
        ? { defaultTimezone: changes.defaultTimezone?.trim() || null }
        : {}),
      ...(changes.supportEmail !== undefined
        ? { supportEmail: changes.supportEmail?.trim().toLowerCase() || null }
        : {}),
      ...(changes.serviceChargePercent !== undefined
        ? {
            serviceChargePercent:
              changes.serviceChargePercent === null
                ? null
                : changes.serviceChargePercent.toFixed(2),
          }
        : {}),
      ...(changes.serviceChargeTaxable !== undefined
        ? { serviceChargeTaxable: changes.serviceChargeTaxable }
        : {}),
      ...(changes.roundingPolicy !== undefined
        ? { roundingPolicy: changes.roundingPolicy }
        : {}),
      ...(changes.defaultTaxMode !== undefined
        ? { defaultTaxMode: changes.defaultTaxMode }
        : {}),
      ...(changes.courseSequencingEnabled !== undefined
        ? { courseSequencingEnabled: changes.courseSequencingEnabled }
        : {}),
      ...(changes.defaultTaxRate !== undefined
        ? {
            defaultTaxRate:
              changes.defaultTaxRate === null
                ? null
                : changes.defaultTaxRate.toFixed(2),
          }
        : {}),
    });
    if (!updated) throw tenantNotFound(tenantId);
    await writeAudit({
      tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "TENANT_UPDATED",
      entity: "tenant",
      entityId: tenantId,
      metadata: { changes },
    });
    return updated;
  },

  async archive(auth: AuthContext, tenantId: string) {
    requirePermission(auth, "tenant:archive");
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) throw tenantNotFound(tenantId);
    const organizationMembership =
      await tenantRepository.findOrganizationMembership(
        auth.userId,
        tenant.organizationId,
      );
    if (!organizationMembership) throw tenantNotFound(tenantId);
    if (tenantId !== auth.tenantId) throw tenantNotFound(tenantId);
    const updated = await tenantRepository.update(tenantId, {
      isActive: false,
    });
    if (!updated) throw tenantNotFound(tenantId);
    await writeAudit({
      tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "TENANT_ARCHIVED",
      entity: "tenant",
      entityId: tenantId,
    });
    return updated;
  },
};
