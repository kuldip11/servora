import { ValidationError } from "@/core/errors";
import { availabilityRepository } from "@/modules/menu/availability/availability.repository";
import { priceRuleRepository } from "@/modules/menu/pricing/price-rule.repository";
import type { PromotionStageOptions } from "./promotion-stage";
import { applyDiscountStages } from "./loyalty-stage";
import { finalizePricing } from "./final-totals-stage";

import type {
  BasePriceStageResult,
  BranchPricingOverride,
  MatchingPriceRule,
  OrderItemInput,
  PricableMenuItem,
  PricedLine,
  PricingContext,
  PricingReplayPriceRule,
  PricingResult,
} from "./pricing.types";
export type {
  BasePriceStageResult,
  BranchPricingOverride,
  MatchingPriceRule,
  OrderItemInput,
  PricableMenuItem,
  PricedLine,
  PricingAttribution,
  PricingContext,
  PricingReplayEvidence,
  PricingReplayPriceRule,
  PricingResult,
} from "./pricing.types";

export const ruleSpecificity = (rule: MatchingPriceRule): number => {
  return [
    rule.variantId,
    rule.branchId,
    rule.channel,
    rule.fulfillmentType,
    rule.startDate,
    rule.endDate,
    rule.startTime,
    rule.endTime,
    rule.customerGroupId,
    rule.coverTier,
  ].filter((value) => value !== null && value !== undefined).length;
};

const timeMatches = (
  start: string | null,
  end: string | null,
  time: string,
) => {
  if (start === null && end === null) return true;
  if (start !== null && end !== null && start > end) {
    return time >= start || time < end;
  }
  return (start === null || time >= start) && (end === null || time < end);
};

export const selectPriceRule = (
  rules: MatchingPriceRule[],
  context: PricingContext,
  variantId?: string,
): MatchingPriceRule | undefined => {
  const iso = context.asOf.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);
  return rules
    .filter(
      (rule) =>
        (rule.variantId === null || rule.variantId === variantId) &&
        (rule.branchId === null || rule.branchId === context.branchId) &&
        (rule.channel === null || rule.channel === context.channel) &&
        (rule.fulfillmentType === null ||
          rule.fulfillmentType === context.fulfillmentType) &&
        (rule.customerGroupId == null ||
          rule.customerGroupId === context.customerGroupId) &&
        (rule.coverTier == null || rule.coverTier === context.coverTier) &&
        (rule.startDate === null || date >= rule.startDate) &&
        (rule.endDate === null || date <= rule.endDate) &&
        timeMatches(rule.startTime, rule.endTime, time),
    )
    .sort(
      (a, b) =>
        (b.tenantId ? 2 : b.organizationId ? 1 : 0) -
          (a.tenantId ? 2 : a.organizationId ? 1 : 0) ||
        ruleSpecificity(b) - ruleSpecificity(a) ||
        b.priority - a.priority ||
        a.id.localeCompare(b.id),
    )[0];
};

export const resolveBasePriceStage = (
  item: PricableMenuItem,
  override?: BranchPricingOverride | undefined,
  percentOffBasePrice?: number | undefined,
): BasePriceStageResult => {
  const basePrice = percentOffBasePrice ?? parseFloat(item.basePrice);
  const percentOff =
    override?.percentOff == null ? null : parseFloat(override.percentOff);
  const price =
    percentOff === null
      ? parseFloat(override?.price ?? item.basePrice)
      : Math.max(0, basePrice * (1 - percentOff / 100));
  const taxRate = parseFloat(override?.taxRate ?? item.taxRate);
  return { price, taxRate, attribution: price };
};

export const resolveVariantStage = (
  item: PricableMenuItem,
  currentPrice: number,
  variantId?: string | undefined,
  preserveCurrentPrice = false,
  allowUnavailable = false,
): { price: number; variantName?: string | undefined; attribution: number } => {
  if (!variantId) return { price: currentPrice, attribution: 0 };

  const variant = item.variants.find((candidate) => candidate.id === variantId);
  if (!variant) throw new ValidationError(`Variant not found on ${item.name}`);
  const variantStatus =
    variant.manualOverrideStatus ?? variant.status ?? "ACTIVE";
  if (
    !allowUnavailable &&
    variant.manualOverrideStatus !== "ACTIVE" &&
    variant.manualStockCount != null &&
    variant.manualStockCount <= 0
  ) {
    throw new ValidationError(`${variant.name} is out of stock`);
  }
  if (!allowUnavailable && variantStatus !== "ACTIVE") {
    throw new ValidationError(
      `${variant.name} is unavailable${variant.manualOverrideReason ? `: ${variant.manualOverrideReason}` : ""}`,
    );
  }

  if (preserveCurrentPrice) {
    return { price: currentPrice, variantName: variant.name, attribution: 0 };
  }
  const price = parseFloat(variant.price);
  return {
    price,
    variantName: variant.name,
    attribution: price - currentPrice,
  };
};

export const resolveModifierStage = (
  item: PricableMenuItem,
  selectedOptions: OrderItemInput["selectedOptions"],
  options: { allowIncompleteSelection?: boolean; variantId?: string } = {},
): { modifiers: PricedLine["modifiers"]; attribution: number } => {
  const groups = item.modifierGroupLinks.map((link) => link.group);
  const optionLookup = new Map<
    string,
    {
      option: PricableMenuItem["modifierGroupLinks"][number]["group"]["options"][number];
      group: PricableMenuItem["modifierGroupLinks"][number]["group"];
    }
  >();
  for (const group of groups)
    for (const option of group.options ?? [])
      optionLookup.set(option.id, { option, group });

  const priceFor = (
    option: PricableMenuItem["modifierGroupLinks"][number]["group"]["options"][number],
  ) => {
    const scoped = options.variantId
      ? option.variantPrices?.find(
          (price) => price.variantId === options.variantId,
        )
      : undefined;
    return parseFloat(scoped?.additionalPrice ?? option.additionalPrice);
  };

  const resolveSet = (
    selections: NonNullable<OrderItemInput["selectedOptions"]>,
    allowIncomplete: boolean,
    priceScale = 1,
  ) => {
    const selectedByGroup = new Map<
      string,
      Array<{ optionId: string; quantity: number; zoneLabel?: string }>
    >();
    for (const selection of selections) {
      const found = optionLookup.get(selection.optionId);
      if (!found)
        throw new ValidationError(
          `Modifier option ${selection.optionId} not found on ${item.name}`,
        );
      if (!found.option.isAvailable)
        throw new ValidationError(
          `${found.option.name} is currently unavailable`,
        );
      const quantity = Math.min(
        selection.quantity ?? 1,
        found.option.maxQuantity ?? 1,
      );
      const list = selectedByGroup.get(found.group.id) ?? [];
      list.push({
        optionId: selection.optionId,
        quantity,
        ...(selection.zoneLabel ? { zoneLabel: selection.zoneLabel } : {}),
      });
      selectedByGroup.set(found.group.id, list);
    }
    const selectedOptionIds = new Set(
      selections.map((selection) => selection.optionId),
    );
    for (const group of groups) {
      const picked = selectedByGroup.get(group.id) ?? [];
      if (
        group.dependsOnOptionId &&
        !selectedOptionIds.has(group.dependsOnOptionId)
      ) {
        if (picked.length)
          throw new ValidationError(
            `"${group.name}" requires its prerequisite selection on ${item.name}`,
          );
        continue;
      }
      if (!allowIncomplete && picked.length < group.minSelections)
        throw new ValidationError(
          `"${group.name}" requires at least ${group.minSelections} selection(s) on ${item.name}`,
        );
      if (group.maxSelections != null && picked.length > group.maxSelections)
        throw new ValidationError(
          `"${group.name}" allows at most ${group.maxSelections} selection(s) on ${item.name}`,
        );
      if (group.selectionType === "SINGLE" && picked.length > 1)
        throw new ValidationError(
          `"${group.name}" only allows one selection on ${item.name}`,
        );
    }
    const modifiers: PricedLine["modifiers"] = [];
    let attribution = 0;
    for (const picks of selectedByGroup.values())
      for (const pick of picks) {
        const found = optionLookup.get(pick.optionId)!;
        const price = priceFor(found.option) * priceScale;
        modifiers.push({
          modifierId: found.option.id,
          modifierGroupName: found.group.name,
          name:
            found.group.groupType === "SUBSTITUTION" &&
            found.option.replacesDefaultComponent
              ? `~~${found.option.replacesDefaultComponent}~~ → ${found.option.name}`
              : found.option.name,
          price,
          quantity: pick.quantity,
          zoneLabel: pick.zoneLabel,
        });
        attribution += price * pick.quantity;
      }
    return { modifiers, attribution };
  };

  const selections = selectedOptions ?? [];
  if (
    !item.supportsZones ||
    !selections.some(
      (selection) => selection.zoneLabel && selection.zoneLabel !== "WHOLE",
    )
  ) {
    return resolveSet(selections, options.allowIncompleteSelection ?? false);
  }

  const whole = selections.filter(
    (selection) => !selection.zoneLabel || selection.zoneLabel === "WHOLE",
  );
  const zoned = selections.filter(
    (selection) => selection.zoneLabel && selection.zoneLabel !== "WHOLE",
  );
  const byZone = new Map<string, typeof zoned>();
  for (const selection of zoned) {
    const label = selection.zoneLabel!;
    const list = byZone.get(label) ?? [];
    list.push(selection);
    byZone.set(label, list);
  }
  const wholeResult = resolveSet(whole, true);
  const rawZoneResults = [...byZone.entries()].map(
    ([label, zoneSelections]) => ({
      label,
      result: resolveSet(zoneSelections, true),
    }),
  );
  const rawTotals = rawZoneResults.map(({ result }) => result.attribution);
  const rule = item.zonePricingRule ?? "HIGHER";
  let scaleByZone = new Map<string, number>();
  if (rule === "HIGHER") {
    const max = Math.max(0, ...rawTotals);
    const winner = rawZoneResults.find(
      ({ result }) => result.attribution === max,
    )?.label;
    for (const { label } of rawZoneResults)
      scaleByZone.set(label, label === winner ? 1 : 0);
  } else {
    const scale =
      rule === "AVERAGE" ? 1 / Math.max(1, rawZoneResults.length) : 0.5;
    for (const { label } of rawZoneResults) scaleByZone.set(label, scale);
  }
  const zoneModifiers: PricedLine["modifiers"] = [];
  let zoneAttribution = 0;
  for (const [label, zoneSelections] of byZone) {
    const result = resolveSet(
      zoneSelections,
      true,
      scaleByZone.get(label) ?? 0,
    );
    zoneModifiers.push(...result.modifiers);
    zoneAttribution += result.attribution;
  }
  return {
    modifiers: [...wholeResult.modifiers, ...zoneModifiers],
    attribution: wholeResult.attribution + zoneAttribution,
  };
};

export const pricingPipeline = {
  async price(
    context: PricingContext,
    requestedLines: OrderItemInput[],
  ): Promise<PricingResult> {
    if (requestedLines.length === 0) {
      return { lines: [], subtotal: 0, taxAmount: 0 };
    }
    const menuItemIds = requestedLines.map((line) => line.menuItemId);
    if (context.historicalReplay && requestedLines.length !== 1) {
      throw new ValidationError(
        "Historical pricing replay accepts exactly one line",
      );
    }
    const items: PricableMenuItem[] = context.historicalReplay
      ? [context.historicalReplay.item]
      : ((await availabilityRepository.findByIds(
          context.tenantId,
          menuItemIds,
          context.branchId,
          context.asOf,
        )) as unknown as PricableMenuItem[]);
    const itemMap = new Map(
      items.map(
        (item) => [item.id, item as unknown as PricableMenuItem] as const,
      ),
    );

    const tenantWideIds = items
      .filter((item) => item.branchId === null)
      .map((item) => item.id);
    const overrides: BranchPricingOverride[] = context.historicalReplay
      ? context.historicalReplay.branchOverride
        ? [context.historicalReplay.branchOverride]
        : []
      : ((await availabilityRepository.findPricingOverrides(
          context.tenantId,
          tenantWideIds,
          context.branchId,
        )) as unknown as BranchPricingOverride[]);
    const overrideByItemId = new Map(
      overrides.map((override) => [override.menuItemId, override] as const),
    );
    const rawRules: PricingReplayPriceRule[] = context.historicalReplay
      ? context.historicalReplay.priceRules
      : ((await priceRuleRepository.findCandidates(
          context.tenantId,
          menuItemIds,
          items.flatMap((item) => (item.sku ? [item.sku] : [])),
        )) as unknown as PricingReplayPriceRule[]);
    const priceRules: MatchingPriceRule[] = rawRules
      .map((rule) => ({
        ...rule,
        effectiveFrom:
          typeof rule.effectiveFrom === "string"
            ? new Date(rule.effectiveFrom)
            : (rule.effectiveFrom ?? null),
      }))
      .filter(
        (rule) => !rule.effectiveFrom || rule.effectiveFrom <= context.asOf,
      );

    let subtotal = 0;
    let taxAmount = 0;

    const lines = requestedLines.map((requestedLine) => {
      const item = itemMap.get(requestedLine.menuItemId);
      if (!item) {
        throw new ValidationError(
          `Menu item ${requestedLine.menuItemId} not found`,
        );
      }
      if (
        !context.allowUnavailable &&
        item.manualOverrideStatus !== "ACTIVE" &&
        item.manualStockCount != null &&
        item.manualStockCount <= 0
      ) {
        throw new ValidationError(`${item.name} is out of stock`);
      }
      if (
        !context.allowUnavailable &&
        !item.isAvailable &&
        item.manualOverrideStatus !== "ACTIVE"
      ) {
        throw new ValidationError(`${item.name} is not available`);
      }

      const branchOverride =
        item.branchId === null
          ? overrideByItemId.get(requestedLine.menuItemId)
          : undefined;
      const candidateRulesForLine = priceRules.filter(
        (rule) =>
          !rule.isPerCover &&
          (rule.menuItemId === requestedLine.menuItemId ||
            (!!item.sku &&
              rule.organizationId != null &&
              rule.menuItemSku === item.sku)),
      );
      const selectedRule = selectPriceRule(
        candidateRulesForLine,
        context,
        requestedLine.variantId,
      );
      const selectedRuleWon = Boolean(
        selectedRule && (!branchOverride || ruleSpecificity(selectedRule) > 1),
      );
      const effectiveOverride: BranchPricingOverride | undefined =
        selectedRuleWon
          ? {
              ...selectedRule!,

              taxRate: selectedRule!.taxRate ?? branchOverride?.taxRate ?? null,
            }
          : branchOverride;
      const selectedVariantRuleWon = Boolean(
        selectedRuleWon &&
        selectedRule!.variantId !== null &&
        selectedRule!.variantId === (requestedLine.variantId ?? null),
      );
      const selectedPercentRuleWon = Boolean(
        selectedRuleWon && selectedRule!.percentOff != null,
      );
      const requestedVariant = requestedLine.variantId
        ? item.variants.find(
            (variant) => variant.id === requestedLine.variantId,
          )
        : undefined;

      const percentOffBasePrice = selectedPercentRuleWon
        ? requestedVariant
          ? parseFloat(requestedVariant.price)
          : parseFloat(branchOverride?.price ?? item.basePrice)
        : selectedVariantRuleWon && requestedVariant
          ? parseFloat(requestedVariant.price)
          : undefined;
      const base = resolveBasePriceStage(
        item,
        effectiveOverride,
        percentOffBasePrice,
      );
      const variant = resolveVariantStage(
        item,
        base.price,
        requestedLine.variantId,
        selectedVariantRuleWon || selectedPercentRuleWon,
        context.allowUnavailable ?? false,
      );
      const modifier = resolveModifierStage(
        item,
        requestedLine.selectedOptions,
        {
          allowIncompleteSelection:
            context.allowIncompleteModifierSelection ?? false,
          ...(requestedLine.variantId !== undefined
            ? { variantId: requestedLine.variantId }
            : {}),
        },
      );
      let resolvedCorePrice = variant.price;
      if ((item.pricingMode ?? "FIXED") === "WEIGHT_BASED") {
        if (!item.weightUnit)
          throw new ValidationError(`${item.name} is missing a weight unit`);
        if (
          requestedLine.weightQuantity == null ||
          !Number.isFinite(requestedLine.weightQuantity) ||
          requestedLine.weightQuantity <= 0
        ) {
          throw new ValidationError(
            `A positive weightQuantity is required for ${item.name}`,
          );
        }
        resolvedCorePrice = variant.price * requestedLine.weightQuantity;
      } else if ((item.pricingMode ?? "FIXED") === "OPEN") {
        if (
          requestedLine.manualPrice == null ||
          !Number.isFinite(requestedLine.manualPrice) ||
          requestedLine.manualPrice < 0
        ) {
          throw new ValidationError(
            `A valid manualPrice is required for ${item.name}`,
          );
        }
        const min =
          item.openPriceMin == null ? null : parseFloat(item.openPriceMin);
        const max =
          item.openPriceMax == null ? null : parseFloat(item.openPriceMax);
        if (
          (min != null && requestedLine.manualPrice < min) ||
          (max != null && requestedLine.manualPrice > max)
        ) {
          throw new ValidationError(
            `Manual price for ${item.name} is outside the configured sanity band`,
          );
        }
        resolvedCorePrice = requestedLine.manualPrice;
      }
      const unitPrice = resolvedCorePrice + modifier.attribution;
      const lineSubtotal = unitPrice * requestedLine.quantity;
      const lineTax = (lineSubtotal * base.taxRate) / 100;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        menuItemId: requestedLine.menuItemId,
        menuItemName: item.name,
        variantId: requestedLine.variantId,
        variantName: variant.variantName,
        quantity: requestedLine.quantity,
        weightQuantity: requestedLine.weightQuantity,
        weightUnit: item.weightUnit ?? undefined,
        manualPrice: requestedLine.manualPrice,
        unitPrice,
        subtotal: lineSubtotal,
        taxRate: base.taxRate,
        taxMode: item.taxMode ?? undefined,
        chefNotes: requestedLine.chefNotes,
        seatLabel: requestedLine.seatLabel,
        courseNumber: requestedLine.courseNumber,
        fulfillmentType: requestedLine.fulfillmentType ?? "DINE_IN",
        modifiers: modifier.modifiers,
        pricingAttribution: {
          BASE_PRICE: base.price,
          VARIANT: variant.attribution,
          MODIFIER: modifier.attribution,
          CATEGORY_ID: item.categoryId,
          PRICE_SOURCE: selectedRuleWon
            ? {
                kind: "PRICE_RULE",
                id: selectedRule!.id,
                description: `Price rule ${selectedRule!.id} matched the explicit order context`,
              }
            : branchOverride
              ? {
                  kind: "BRANCH_OVERRIDE",
                  id:
                    branchOverride.id ??
                    `branch:${context.branchId}:${requestedLine.menuItemId}`,
                  description: `Branch override ${branchOverride.id ?? `${context.branchId}/${requestedLine.menuItemId}`} supplied the scoped price`,
                }
              : {
                  kind: "MENU_ITEM",
                  id: item.id,
                  description: "Menu item base price supplied stage 1",
                },
        },
        pricingReplayEvidence: context.historicalReplay ?? {
          requestedLine: {
            ...requestedLine,
            selectedOptions: requestedLine.selectedOptions?.map((option) => ({
              ...option,
            })),
          },
          item,
          branchOverride: branchOverride ?? null,
          priceRules: priceRules.filter(
            (rule) =>
              rule.menuItemId === requestedLine.menuItemId ||
              (!!item.sku &&
                rule.organizationId != null &&
                rule.menuItemSku === item.sku),
          ),
        },
      } satisfies PricedLine;
    });

    return { lines, subtotal, taxAmount };
  },

  async resolvePerCoverRate(
    context: PricingContext,
    ruleId: string,
  ): Promise<{ ruleId: string; rate: number; taxRate: number }> {
    const rule = (await priceRuleRepository.findPerCoverRule(
      context.tenantId,
      ruleId,
    )) as MatchingPriceRule | undefined;
    if (!rule || !rule.isPerCover)
      throw new ValidationError(
        "Per-cover price rule not found or unavailable",
      );
    const selected = selectPriceRule([rule], context);
    if (!selected || selected.price == null)
      throw new ValidationError(
        "Per-cover price rule is not active for this order context",
      );
    return {
      ruleId: selected.id,
      rate: Number(selected.price),
      taxRate: Number(selected.taxRate ?? 0),
    };
  },
  async applyPromotions(
    context: PricingContext,
    lines: PricedLine[],
    options?: PromotionStageOptions,
  ) {
    return applyDiscountStages(context, lines, options);
  },
  async finalize(
    context: PricingContext,
    lines: PricedLine[],
    options?: PromotionStageOptions,
  ) {
    return finalizePricing(context, lines, options);
  },
};
