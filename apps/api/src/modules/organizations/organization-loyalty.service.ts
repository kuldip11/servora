import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import { NotFoundError, ValidationError } from "@/core/errors";
import { loyaltyRepository } from "@/modules/loyalty/loyalty.repository";
import type { LoyaltyTierInput } from "@/modules/loyalty/loyalty.service";
import { assertOrganizationManager } from "./organization-authorization";

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

export const organizationLoyaltyService = {
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
};
