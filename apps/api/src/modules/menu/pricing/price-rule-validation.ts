import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { NotFoundError, ValidationError } from "@/core/errors";
import { compact } from "@/lib/object-utils";
import { customerGroupRepository } from "@/modules/customer-groups/customer-group.repository";
import { itemRepository } from "@/modules/menu/items/item.repository";
import { assertMenuResourceBranch } from "@/modules/menu/menu-authorization";
import {
  ruleSpecificity,
  type MatchingPriceRule,
} from "@/modules/orders/pricing/pricing-pipeline";
import { priceRuleRepository } from "./price-rule.repository";
import type { PriceRuleInput } from "./price-rule.types";

export const assertExactlyOnePriceValue = (
  input: Pick<PriceRuleInput, "price" | "percentOff">,
) => {
  const hasPrice = input.price !== undefined && input.price !== null;
  const hasPercentOff =
    input.percentOff !== undefined && input.percentOff !== null;
  if (hasPrice === hasPercentOff) {
    throw new ValidationError(
      "Price rule requires exactly one of price or percentOff",
    );
  }
  if (hasPercentOff && (input.percentOff! <= 0 || input.percentOff! > 100)) {
    throw new ValidationError(
      "percentOff must be greater than 0 and at most 100",
    );
  }
  if (hasPrice && input.price! < 0)
    throw new ValidationError("price cannot be negative");
};

export const validateScope = async (
  auth: AuthContext,
  input: PriceRuleInput,
) => {
  if (input.organizationId) {
    requirePermission(auth, "organization:manage");
    const tenantOrganizationId =
      await priceRuleRepository.organizationIdForTenant(auth.tenantId);
    if (tenantOrganizationId !== input.organizationId)
      throw new ValidationError(
        "Organization scope is outside the active tenant organization",
      );
    if (!input.menuItemSku?.trim() && !input.isPerCover)
      throw new ValidationError(
        "Organization item price rules require menuItemSku",
      );
    if (input.branchId || input.variantId)
      throw new ValidationError(
        "Organization-level rules cannot target tenant-local branches or variants",
      );
  } else if (!input.isPerCover) {
    if (!input.menuItemId)
      throw new ValidationError("Menu-item price rules require menuItemId");
    const item = await itemRepository.findById(auth.tenantId, input.menuItemId);
    if (!item) throw new NotFoundError("Menu item not found");
    assertMenuResourceBranch(auth, item.branchId, { allowShared: true });
    if (input.branchId) assertMenuResourceBranch(auth, input.branchId);
    if (
      input.variantId &&
      !item.variants.some((variant) => variant.id === input.variantId)
    )
      throw new ValidationError(
        "Variant does not belong to the selected menu item",
      );
  }
  if (input.customerGroupId) {
    const group = await customerGroupRepository.findById(
      auth.tenantId,
      input.customerGroupId,
    );
    if (!group)
      throw new ValidationError(
        "Customer group does not belong to this tenant",
      );
  }
  if (input.isPerCover) {
    if (input.menuItemId || input.menuItemSku)
      throw new ValidationError(
        "Per-cover price rules cannot target a menu item",
      );
    if (input.variantId)
      throw new ValidationError(
        "Per-cover price rules cannot target a variant",
      );
    if (input.percentOff != null)
      throw new ValidationError(
        "Per-cover price rules require an absolute price",
      );
  } else if (input.coverTier) {
    throw new ValidationError(
      "coverTier is only valid on a per-cover price rule",
    );
  }
};

const timeIntervals = (
  start: string | null,
  end: string | null,
): Array<[string, string]> => {
  if (start !== null && end !== null && start > end) {
    return [
      [start, "24:00:00"],
      ["00:00:00", end],
    ];
  }
  return [[start ?? "00:00:00", end ?? "24:00:00"]];
};

const timeWindowsOverlap = (
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null,
): boolean => {
  const a = timeIntervals(aStart, aEnd);
  const b = timeIntervals(bStart, bEnd);
  return a.some(([aS, aE]) => b.some(([bS, bE]) => aS < bE && bS < aE));
};

const dateRangesOverlap = (
  aStart: string | null,
  aEnd: string | null,
  bStart: string | null,
  bEnd: string | null,
): boolean => {
  const aS = aStart ?? "0000-01-01";
  const aE = aEnd ?? "9999-12-31";
  const bS = bStart ?? "0000-01-01";
  const bE = bEnd ?? "9999-12-31";
  return aS <= bE && bS <= aE;
};

const scopesCanOverlap = (
  a: Pick<
    MatchingPriceRule,
    | "variantId"
    | "branchId"
    | "channel"
    | "fulfillmentType"
    | "customerGroupId"
    | "coverTier"
  >,
  b: Pick<
    MatchingPriceRule,
    | "variantId"
    | "branchId"
    | "channel"
    | "fulfillmentType"
    | "customerGroupId"
    | "coverTier"
  >,
) => {
  const overlaps = <T>(
    left: T | null | undefined,
    right: T | null | undefined,
  ) => left == null || right == null || left === right;
  return (
    overlaps(a.variantId, b.variantId) &&
    overlaps(a.branchId, b.branchId) &&
    overlaps(a.channel, b.channel) &&
    overlaps(a.fulfillmentType, b.fulfillmentType) &&
    overlaps(a.customerGroupId, b.customerGroupId) &&
    overlaps(a.coverTier, b.coverTier)
  );
};

export const assertNoAmbiguousOverlap = async (
  auth: AuthContext,
  candidate: MatchingPriceRule & {
    menuItemId: string | null;
    menuItemSku?: string | null;
    organizationId?: string | null;
    isPerCover?: boolean;
    isActive?: boolean;
  },
  excludeId?: string,
) => {
  if (candidate.isActive === false) return;
  const existingRules = candidate.organizationId
    ? await priceRuleRepository.listOrganization(
        candidate.organizationId,
        candidate.menuItemSku ?? undefined,
      )
    : await priceRuleRepository.list(
        auth.tenantId,
        candidate.menuItemId ?? undefined,
      );
  const candidateSpecificity = ruleSpecificity(candidate);

  for (const other of existingRules as unknown as (MatchingPriceRule & {
    isActive: boolean;
  })[]) {
    if (!other.isActive) continue;
    if (excludeId && other.id === excludeId) continue;
    if (
      Boolean((other as { isPerCover?: boolean }).isPerCover) !==
      Boolean(candidate.isPerCover)
    )
      continue;
    if (!scopesCanOverlap(candidate, other)) continue;
    if (ruleSpecificity(other) !== candidateSpecificity) continue;
    if (other.priority !== candidate.priority) continue;
    if (
      !dateRangesOverlap(
        candidate.startDate,
        candidate.endDate,
        other.startDate,
        other.endDate,
      )
    )
      continue;
    if (
      !timeWindowsOverlap(
        candidate.startTime,
        candidate.endTime,
        other.startTime,
        other.endTime,
      )
    )
      continue;

    throw new ValidationError(
      `This rule's scope and time window overlap ambiguously with an existing price rule (${other.id}) of equal specificity and priority. Adjust the window, scope, or priority so exactly one rule applies.`,
    );
  }
};

export const toPersistence = (input: PriceRuleInput) => {
  assertExactlyOnePriceValue(input);
  const { effectiveFrom, price, percentOff, taxRate, ...fields } = input;
  return compact({
    ...fields,
    ...(effectiveFrom !== undefined
      ? { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null }
      : {}),
    price:
      price === undefined ? undefined : price === null ? null : String(price),
    percentOff:
      percentOff === undefined
        ? undefined
        : percentOff === null
          ? null
          : String(percentOff),
    taxRate:
      taxRate === undefined
        ? undefined
        : taxRate === null
          ? null
          : String(taxRate),
  });
};
