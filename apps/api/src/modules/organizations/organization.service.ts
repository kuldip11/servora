import type { AuthContext } from "@/core/auth";
import { loyaltyRepository } from "@/modules/loyalty/loyalty.repository";
import type { LoyaltyTierInput } from "@/modules/loyalty/loyalty.service";
import { requirePermission } from "@/core/auth";
import { ForbiddenError, NotFoundError, ValidationError } from "@/core/errors";
import { writeAudit } from "@/core/audit";
import { organizationRepository } from "./organization.repository";
import { organizationNotFound } from "./organization.errors";

const assertOrganizationManager = async (
  auth: AuthContext,
  organizationId: string,
) => {
  const membership = await organizationRepository.findMembership(
    auth.userId,
    organizationId,
  );
  if (!membership) throw organizationNotFound(organizationId);
  requirePermission(auth, "organization:manage");
};

const normalizedOrganizationTier = (input: LoyaltyTierInput) => {
  const hasPercent =
    input.discountPercent !== undefined && input.discountPercent !== null;
  const hasFixed =
    input.discountFixed !== undefined && input.discountFixed !== null;
  if (hasPercent === hasFixed)
    throw new ValidationError(
      "Loyalty tier requires exactly one discount type",
    );
  if (
    hasPercent &&
    (input.discountPercent! <= 0 || input.discountPercent! > 100)
  )
    throw new ValidationError(
      "Loyalty percentage must be greater than 0 and at most 100%",
    );
  if (hasFixed && input.discountFixed! <= 0)
    throw new ValidationError("Loyalty fixed discount must be greater than 0");
  return {
    name: input.name.trim(),
    discountPercent: hasPercent ? input.discountPercent!.toFixed(2) : null,
    discountFixed: hasFixed ? input.discountFixed!.toFixed(2) : null,
  };
};

export interface OrganizationMenuInput {
  name: string;
  description?: string | null;
  status?: "DRAFT" | "PUBLISHED";
  isDefault?: boolean;
  availableChannels?: string[] | null;
  availableFulfillmentTypes?: string[] | null;
  effectiveFrom?: string | null;
  items: Array<{
    itemSku: string;
    categoryName?: string | null;
    sortOrder?: number;
  }>;
}

const normalizeMenuInput = (input: OrganizationMenuInput) => {
  const { effectiveFrom, ...rest } = input;
  const seen = new Set<string>();
  for (const item of input.items) {
    const sku = item.itemSku.trim();
    if (!sku)
      throw new ValidationError("Organization menu item SKU cannot be blank");
    if (seen.has(sku))
      throw new ValidationError(`Duplicate organization menu SKU: ${sku}`);
    seen.add(sku);
  }
  return {
    ...rest,
    name: input.name.trim(),
    ...(effectiveFrom !== undefined
      ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null }
      : {}),
    items: input.items.map((item) => ({
      ...item,
      itemSku: item.itemSku.trim(),
    })),
  };
};

export const organizationService = {
  async listLoyaltyTiers(auth: AuthContext, organizationId: string) {
    await assertOrganizationManager(auth, organizationId);
    return loyaltyRepository.listOrganizationTiers(organizationId);
  },
  async createLoyaltyTier(
    auth: AuthContext,
    organizationId: string,
    input: LoyaltyTierInput,
  ) {
    await assertOrganizationManager(auth, organizationId);
    const row = await loyaltyRepository.createOrganizationTier(
      organizationId,
      normalizedOrganizationTier(input),
    );
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORGANIZATION_LOYALTY_TIER_CREATED",
      entity: "customer_loyalty_tier",
      entityId: row.id,
      metadata: { organizationId },
    });
    return row;
  },
  async updateLoyaltyTier(
    auth: AuthContext,
    organizationId: string,
    tierId: string,
    patch: Partial<LoyaltyTierInput>,
  ) {
    await assertOrganizationManager(auth, organizationId);
    const existing = await loyaltyRepository.findOrganizationTier(
      organizationId,
      tierId,
    );
    if (!existing)
      throw new NotFoundError("Organization loyalty tier not found");
    const merged: LoyaltyTierInput = {
      name: patch.name ?? existing.name,
      ...(patch.discountPercent !== undefined
        ? { discountPercent: patch.discountPercent }
        : existing.discountPercent !== null
          ? { discountPercent: Number(existing.discountPercent) }
          : {}),
      ...(patch.discountFixed !== undefined
        ? { discountFixed: patch.discountFixed }
        : existing.discountFixed !== null
          ? { discountFixed: Number(existing.discountFixed) }
          : {}),
    };
    const row = await loyaltyRepository.updateOrganizationTier(
      organizationId,
      tierId,
      normalizedOrganizationTier(merged),
    );
    if (!row) throw new NotFoundError("Organization loyalty tier not found");
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORGANIZATION_LOYALTY_TIER_UPDATED",
      entity: "customer_loyalty_tier",
      entityId: tierId,
      metadata: { organizationId },
    });
    return row;
  },
  async deleteLoyaltyTier(
    auth: AuthContext,
    organizationId: string,
    tierId: string,
  ) {
    await assertOrganizationManager(auth, organizationId);
    const existing = await loyaltyRepository.findOrganizationTier(
      organizationId,
      tierId,
    );
    if (!existing)
      throw new NotFoundError("Organization loyalty tier not found");
    await loyaltyRepository.removeOrganizationTier(organizationId, tierId);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORGANIZATION_LOYALTY_TIER_DELETED",
      entity: "customer_loyalty_tier",
      entityId: tierId,
      metadata: { organizationId },
    });
  },
  async list(auth: AuthContext) {
    const memberships = await organizationRepository.findMembershipsByUserId(
      auth.userId,
    );
    return memberships.map((membership) => membership.organization);
  },

  async create(
    auth: AuthContext,
    input: {
      name: string;
      businessType?: string | null;
      country?: string | null;
      timezone?: string | null;
      currency?: string | null;
      primaryContactName?: string | null;
      businessEmail?: string | null;
      businessPhone?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      stateProvince?: string | null;
      postalCode?: string | null;
      legalName?: string | null;
      website?: string | null;
      taxRegistrationNumber?: string | null;
      gstin?: string | null;
      pan?: string | null;
      companyRegistrationNumber?: string | null;
      logoUrl?: string | null;
    },
  ) {
    if (!auth.roles.includes("OWNER")) {
      throw new ForbiddenError(
        "Only the global Owner can create organizations",
      );
    }
    const result = await organizationRepository.create({
      ...input,
      name: input.name.trim(),
      ...(input.country !== undefined
        ? { country: input.country?.trim().toUpperCase() || null }
        : {}),
      ...(input.currency !== undefined
        ? { currency: input.currency?.trim().toUpperCase() || null }
        : {}),
      ...(input.businessEmail !== undefined
        ? { businessEmail: input.businessEmail?.trim().toLowerCase() || null }
        : {}),
      ...(input.gstin !== undefined
        ? { gstin: input.gstin?.trim().toUpperCase() || null }
        : {}),
      ...(input.pan !== undefined
        ? { pan: input.pan?.trim().toUpperCase() || null }
        : {}),
      createdBy: auth.userId,
    });
    return {
      organization: result.organization,
      membershipId: result.membership.id,
    };
  },

  async update(
    auth: AuthContext,
    organizationId: string,
    changes: {
      name?: string;
      businessType?: string | null;
      country?: string | null;
      timezone?: string | null;
      currency?: string | null;
      primaryContactName?: string | null;
      businessEmail?: string | null;
      businessPhone?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      stateProvince?: string | null;
      postalCode?: string | null;
      legalName?: string | null;
      website?: string | null;
      taxRegistrationNumber?: string | null;
      gstin?: string | null;
      pan?: string | null;
      companyRegistrationNumber?: string | null;
      logoUrl?: string | null;
    },
  ) {
    await assertOrganizationManager(auth, organizationId);
    const updated = await organizationRepository.update(organizationId, {
      ...changes,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.country !== undefined
        ? { country: changes.country?.trim().toUpperCase() || null }
        : {}),
      ...(changes.currency !== undefined
        ? { currency: changes.currency?.trim().toUpperCase() || null }
        : {}),
      ...(changes.businessEmail !== undefined
        ? { businessEmail: changes.businessEmail?.trim().toLowerCase() || null }
        : {}),
      ...(changes.gstin !== undefined
        ? { gstin: changes.gstin?.trim().toUpperCase() || null }
        : {}),
      ...(changes.pan !== undefined
        ? { pan: changes.pan?.trim().toUpperCase() || null }
        : {}),
    });
    if (!updated) throw organizationNotFound(organizationId);
    return updated;
  },

  async archive(auth: AuthContext, organizationId: string) {
    await assertOrganizationManager(auth, organizationId);
    const updated = await organizationRepository.update(organizationId, {
      isActive: false,
    });
    if (!updated) throw organizationNotFound(organizationId);
    return updated;
  },

  async listTenants(auth: AuthContext, organizationId: string) {
    await assertOrganizationManager(auth, organizationId);
    return organizationRepository.listTenants(organizationId);
  },

  async listMenus(auth: AuthContext, organizationId: string) {
    await assertOrganizationManager(auth, organizationId);
    return organizationRepository.listMenus(organizationId);
  },

  async createMenu(
    auth: AuthContext,
    organizationId: string,
    input: OrganizationMenuInput,
  ) {
    await assertOrganizationManager(auth, organizationId);
    const created = await organizationRepository.createMenu({
      organizationId,
      ...normalizeMenuInput(input),
    });
    if (!created) throw new NotFoundError("Organization menu");
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORGANIZATION_MENU_CREATED",
      entity: "organization_menu",
      entityId: created.id,
      metadata: { organizationId, status: created.status },
    });
    return created;
  },

  async updateMenu(
    auth: AuthContext,
    organizationId: string,
    menuId: string,
    input: Partial<OrganizationMenuInput>,
  ) {
    await assertOrganizationManager(auth, organizationId);
    const normalized =
      input.items !== undefined
        ? normalizeMenuInput({
            name: input.name ?? "unchanged",
            items: input.items,
            ...input,
          })
        : (() => {
            const { effectiveFrom, ...rest } = input;
            return {
              ...rest,
              ...(input.name !== undefined ? { name: input.name.trim() } : {}),
              ...(effectiveFrom !== undefined
                ? {
                    effectiveFrom: effectiveFrom
                      ? new Date(effectiveFrom)
                      : null,
                  }
                : {}),
            };
          })();
    const updated = await organizationRepository.updateMenu(
      organizationId,
      menuId,
      normalized,
    );
    if (!updated) throw new NotFoundError("Organization menu", menuId);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORGANIZATION_MENU_UPDATED",
      entity: "organization_menu",
      entityId: menuId,
      metadata: { organizationId, status: updated.status },
    });
    return updated;
  },

  async deleteMenu(auth: AuthContext, organizationId: string, menuId: string) {
    await assertOrganizationManager(auth, organizationId);
    const deleted = await organizationRepository.deleteMenu(
      organizationId,
      menuId,
    );
    if (!deleted) throw new NotFoundError("Organization menu", menuId);
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "ORGANIZATION_MENU_DELETED",
      entity: "organization_menu",
      entityId: menuId,
      metadata: { organizationId },
    });
  },
};
