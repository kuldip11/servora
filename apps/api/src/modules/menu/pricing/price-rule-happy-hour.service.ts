import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { NotFoundError, ValidationError } from "@/core/errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import { itemRepository } from "@/modules/menu/items/item.repository";
import { assertMenuResourceBranch } from "@/modules/menu/menu-authorization";
import { priceRuleRepository } from "./price-rule.repository";
import type { HappyHourInput, PriceRuleInput } from "./price-rule.types";
import {
  assertNoAmbiguousOverlap,
  toPersistence,
  validateScope,
} from "./price-rule-validation";

export const priceRuleHappyHourService = {
  async createHappyHour(auth: AuthContext, input: HappyHourInput) {
    requirePermission(auth, "menu:pricing:write");
    if ((input.categoryId ? 1 : 0) + (input.menuId ? 1 : 0) !== 1) {
      throw new ValidationError(
        "Happy hour requires exactly one category or menu scope",
      );
    }
    if (input.percentOff <= 0 || input.percentOff > 100) {
      throw new ValidationError(
        "Happy-hour discount must be greater than 0 and at most 100%",
      );
    }
    if (input.startDate && input.endDate && input.startDate > input.endDate) {
      throw new ValidationError(
        "Happy-hour start date must be before end date",
      );
    }
    if (input.branchId) assertMenuResourceBranch(auth, input.branchId);

    let menuItemIds: string[] | null;
    if (input.categoryId) {
      const category = await itemRepository.findCategory(
        auth.tenantId,
        input.categoryId,
      );
      if (!category) throw new NotFoundError("Menu category not found");
      assertMenuResourceBranch(auth, category.branchId, { allowShared: true });
      menuItemIds = await itemRepository.findIdsByCategory(
        auth.tenantId,
        input.categoryId,
      );
    } else {
      menuItemIds = await itemRepository.findIdsByMenu(
        auth.tenantId,
        input.menuId!,
      );
      if (menuItemIds === null) throw new NotFoundError("Menu not found");
    }
    if (menuItemIds.length === 0)
      throw new ValidationError("Selected happy-hour scope has no menu items");

    const candidates: PriceRuleInput[] = menuItemIds.map((menuItemId) => ({
      menuItemId,
      variantId: null,
      branchId: input.branchId ?? null,
      channel: input.channel ?? null,
      fulfillmentType: input.fulfillmentType ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      startTime: input.startTime,
      endTime: input.endTime,
      price: null,
      percentOff: input.percentOff,
      taxRate: null,
      priority: input.priority ?? 0,
      isActive: true,
    }));

    for (const candidate of candidates) {
      await validateScope(auth, candidate);
      await assertNoAmbiguousOverlap(auth, {
        id: "",
        menuItemId: candidate.menuItemId ?? null,
        variantId: null,
        branchId: candidate.branchId ?? null,
        channel: candidate.channel ?? null,
        fulfillmentType: candidate.fulfillmentType ?? null,
        startDate: candidate.startDate ?? null,
        endDate: candidate.endDate ?? null,
        startTime: candidate.startTime ?? null,
        endTime: candidate.endTime ?? null,
        priority: candidate.priority ?? 0,
        price: null,
        percentOff: String(input.percentOff),
        taxRate: null,
        isActive: true,
      });
    }

    const created = await priceRuleRepository.createMany(
      candidates.map((candidate) => ({
        tenantId: auth.tenantId,
        ...toPersistence(candidate),
      })),
    );
    await Promise.all(
      created.map((rule) =>
        menuChangeLog.record(
          auth,
          "PRICE_RULE",
          rule.id,
          "CREATED",
          buildDiff(null, rule),
        ),
      ),
    );
    return created;
  },
};
