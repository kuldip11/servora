import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { NotFoundError, ValidationError } from "@/core/errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import { assertMenuResourceBranch } from "@/modules/menu/menu-authorization";
import { priceRuleRepository } from "./price-rule.repository";
import type { PriceRuleInput } from "./price-rule.types";
import {
  assertExactlyOnePriceValue,
  assertNoAmbiguousOverlap,
  toPersistence,
  validateScope,
} from "./price-rule-validation";

export const priceRuleLifecycleService = {
  async list(
    auth: AuthContext,
    menuItemId?: string,
    organizationId?: string,
    menuItemSku?: string,
  ) {
    requirePermission(auth, "menu:read");
    if (organizationId) {
      requirePermission(auth, "organization:manage");
      const tenantOrganizationId =
        await priceRuleRepository.organizationIdForTenant(auth.tenantId);
      if (tenantOrganizationId !== organizationId)
        throw new ValidationError(
          "Organization scope is outside the active tenant organization",
        );
      return priceRuleRepository.listOrganization(organizationId, menuItemSku);
    }
    return priceRuleRepository.list(auth.tenantId, menuItemId);
  },

  async create(auth: AuthContext, input: PriceRuleInput) {
    requirePermission(auth, "menu:pricing:write");
    assertExactlyOnePriceValue(input);
    await validateScope(auth, input);
    await assertNoAmbiguousOverlap(auth, {
      id: "",
      menuItemId: input.menuItemId ?? null,
      menuItemSku: input.menuItemSku ?? null,
      organizationId: input.organizationId ?? null,
      tenantId: input.organizationId ? null : auth.tenantId,
      customerGroupId: input.customerGroupId ?? null,
      coverTier: input.coverTier ?? null,
      isPerCover: input.isPerCover ?? false,
      variantId: input.variantId ?? null,
      branchId: input.branchId ?? null,
      channel: input.channel ?? null,
      fulfillmentType: input.fulfillmentType ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      priority: input.priority ?? 0,
      price: input.price == null ? null : String(input.price),
      percentOff: input.percentOff == null ? null : String(input.percentOff),
      taxRate: null,
      isActive: input.isActive ?? true,
    });
    const created = await priceRuleRepository.create({
      tenantId: input.organizationId ? null : auth.tenantId,
      ...toPersistence(input),
      organizationId: input.organizationId ?? null,
      menuItemSku: input.menuItemSku?.trim() || null,
    });
    await menuChangeLog.record(
      auth,
      "PRICE_RULE",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async update(auth: AuthContext, id: string, input: Partial<PriceRuleInput>) {
    requirePermission(auth, "menu:pricing:write");
    const existing = await priceRuleRepository.findById(auth.tenantId, id);
    if (!existing) throw new NotFoundError("Price rule not found");

    if (existing.organizationId || input.organizationId) {
      requirePermission(auth, "organization:manage");
    }
    const merged = { ...existing, ...input } as unknown as PriceRuleInput;
    assertExactlyOnePriceValue(merged);
    await validateScope(auth, merged);
    await assertNoAmbiguousOverlap(
      auth,
      {
        id: existing.id,
        menuItemId: merged.menuItemId ?? null,
        menuItemSku: merged.menuItemSku ?? null,
        organizationId: merged.organizationId ?? null,
        tenantId: merged.organizationId ? null : auth.tenantId,
        customerGroupId: merged.customerGroupId ?? null,
        coverTier: merged.coverTier ?? null,
        isPerCover: merged.isPerCover ?? false,
        variantId: merged.variantId ?? null,
        branchId: merged.branchId ?? null,
        channel: merged.channel ?? null,
        fulfillmentType: merged.fulfillmentType ?? null,
        startDate: merged.startDate ?? null,
        endDate: merged.endDate ?? null,
        startTime: merged.startTime ?? null,
        endTime: merged.endTime ?? null,
        priority: merged.priority ?? 0,
        price: merged.price == null ? null : String(merged.price),
        percentOff:
          merged.percentOff == null ? null : String(merged.percentOff),
        taxRate: null,
        isActive: merged.isActive ?? true,
      },
      existing.id,
    );
    const updated = await priceRuleRepository.update(
      auth.tenantId,
      id,
      toPersistence(merged),
    );
    if (!updated) throw new NotFoundError("Price rule not found");
    await menuChangeLog.record(
      auth,
      "PRICE_RULE",
      id,
      "UPDATED",
      buildDiff(existing, updated),
    );
    return updated;
  },

  async remove(auth: AuthContext, id: string) {
    requirePermission(auth, "menu:pricing:write");
    const existing = await priceRuleRepository.findById(auth.tenantId, id);
    if (!existing) return;
    if (existing.organizationId) {
      requirePermission(auth, "organization:manage");
      const tenantOrganizationId =
        await priceRuleRepository.organizationIdForTenant(auth.tenantId);
      if (tenantOrganizationId !== existing.organizationId) {
        throw new ValidationError(
          "Organization scope is outside the active tenant organization",
        );
      }
    }
    assertMenuResourceBranch(auth, existing.branchId);
    await priceRuleRepository.remove(auth.tenantId, id);
    await menuChangeLog.record(
      auth,
      "PRICE_RULE",
      id,
      "DELETED",
      buildDiff(existing, null),
    );
  },
};
