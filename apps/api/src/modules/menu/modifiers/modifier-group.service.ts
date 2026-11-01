import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { InternalError, ValidationError } from "@/core/errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";
import {
  assertMenuResourceBranch,
  resolveMenuBranch,
} from "@/modules/menu/menu-authorization";
import {
  modifierGroupNotFound,
  modifierOptionNotFound,
} from "./modifier.errors";
import { modifierRepository } from "./modifier.repository";
import type {
  CreateModifierGroupInput,
  UpdateModifierGroupInput,
} from "./modifier.types";
import {
  assertNoCircularDependency,
  withStringPrice,
} from "./modifier-validation";

export const modifierGroupService = {
  async listGroups(auth: AuthContext) {
    requirePermission(auth, "menu:read");
    resolveMenuBranch(auth);
    return modifierRepository.findModifierGroups(
      auth.tenantId,
      auth.branchId ?? undefined,
    );
  },

  async createGroup(auth: AuthContext, input: CreateModifierGroupInput) {
    requirePermission(auth, "menu:create");
    const branchId = resolveMenuBranch(auth, input.branchId);
    if (
      (input.groupType ?? "ADDON") === "ADDON" &&
      input.options?.some((option) => option.additionalPrice < 0)
    )
      throw new ValidationError("Addon modifier prices cannot be negative");
    if (input.options?.some((option) => option.variantPrices?.length)) {
      throw new ValidationError(
        "Create the modifier group first, attach it to an item, then configure variant-specific prices",
      );
    }
    const created = await modifierRepository.createModifierGroup({
      ...input,
      tenantId: auth.tenantId,
      branchId,
      options: input.options?.map(withStringPrice),
    });
    if (!created)
      throw new InternalError("Modifier group could not be created");
    await menuChangeLog.record(
      auth,
      "MODIFIER_GROUP",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async updateGroup(
    auth: AuthContext,
    groupId: string,
    input: UpdateModifierGroupInput,
  ) {
    requirePermission(auth, "menu:update");
    const existing = await modifierRepository.findModifierGroup(
      auth.tenantId,
      groupId,
    );
    if (!existing) throw modifierGroupNotFound(groupId);
    assertMenuResourceBranch(auth, existing.branchId);
    if (input.dependsOnOptionId !== undefined) {
      await assertNoCircularDependency(
        auth.tenantId,
        groupId,
        input.dependsOnOptionId,
      );
    }
    const { options, ...groupFields } = input;
    if (
      (input.groupType ?? existing.groupType ?? "ADDON") === "ADDON" &&
      options?.some((option) => option.additionalPrice < 0)
    )
      throw new ValidationError("Addon modifier prices cannot be negative");
    if (
      (input.groupType ?? existing.groupType ?? "ADDON") === "ADDON" &&
      options?.some((option) =>
        option.variantPrices?.some((price) => price.additionalPrice < 0),
      )
    ) {
      throw new ValidationError(
        "Addon variant-specific modifier prices cannot be negative",
      );
    }
    for (const option of options ?? []) {
      const ids = option.variantPrices?.map((price) => price.variantId) ?? [];
      if (new Set(ids).size !== ids.length)
        throw new ValidationError(
          "A modifier option can have only one price override per variant",
        );
    }
    if (options?.some((option) => option.variantPrices?.length)) {
      const variantIds = [
        ...new Set(
          options.flatMap(
            (option) =>
              option.variantPrices?.map((price) => price.variantId) ?? [],
          ),
        ),
      ];
      const eligible = await modifierRepository.findEligibleVariantIdsForGroup(
        auth.tenantId,
        groupId,
        variantIds,
      );
      const invalid = variantIds.filter(
        (variantId) => !eligible.has(variantId),
      );
      if (invalid.length) {
        throw new ValidationError(
          "Variant-specific modifier prices can only target variants of tenant items that use this modifier group",
        );
      }
    }
    const group = await modifierRepository.updateModifierGroup(
      auth.tenantId,
      groupId,
      groupFields,
    );
    if (!group) throw modifierGroupNotFound(groupId);

    if (options !== undefined) {
      await modifierRepository.setModifierGroupOptions(
        groupId,
        options.map(withStringPrice),
      );
    }

    await menuChangeLog.record(
      auth,
      "MODIFIER_GROUP",
      groupId,
      "UPDATED",
      buildDiff(existing, { ...group, options }),
    );

    return group;
  },

  async deleteGroup(auth: AuthContext, groupId: string) {
    requirePermission(auth, "menu:delete");
    const existing = await modifierRepository.findModifierGroup(
      auth.tenantId,
      groupId,
    );
    if (!existing) return;
    assertMenuResourceBranch(auth, existing.branchId);
    await modifierRepository.deleteModifierGroup(auth.tenantId, groupId);
    await menuChangeLog.record(
      auth,
      "MODIFIER_GROUP",
      groupId,
      "DELETED",
      buildDiff(existing, null),
    );
  },

  async setOptionAvailability(
    auth: AuthContext,
    optionId: string,
    isAvailable: boolean,
  ) {
    requirePermission(auth, "menu:update");
    const existing = await modifierRepository.findModifierOption(
      auth.tenantId,
      optionId,
    );
    if (!existing) throw modifierOptionNotFound(optionId);
    assertMenuResourceBranch(auth, existing.branchId);
    const updated = await modifierRepository.setOptionAvailability(
      auth.tenantId,
      optionId,
      isAvailable,
    );
    if (!updated) throw modifierOptionNotFound(optionId);
    await menuChangeLog.record(
      auth,
      "MODIFIER_OPTION",
      optionId,
      "UPDATED",
      buildDiff(existing, updated),
    );
    return updated;
  },
};
