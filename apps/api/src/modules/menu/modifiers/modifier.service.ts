import type { AuthContext } from "@/core/auth";
import { modifierRepository } from "./modifier.repository";
import { requirePermission } from "@/core/auth";
import { ValidationError, InternalError } from "@/core/errors";
import {
  assertMenuResourceBranch,
  resolveMenuBranch,
} from "@/modules/menu/menu-authorization";
import {
  modifierGroupNotFound,
  modifierOptionNotFound,
} from "./modifier.errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";

type SelectionType = "SINGLE" | "MULTIPLE";

export interface ModifierOptionInput {
  id?: string | undefined;
  name: string;
  additionalPrice: number;
  isAvailable?: boolean | undefined;
  maxQuantity?: number | undefined;
  isDefault?: boolean | undefined;
  replacesDefaultComponent?: string | undefined;
  variantPrices?:
    Array<{ variantId: string; additionalPrice: number }> | undefined;
}

export interface CreateModifierGroupInput {
  name: string;
  selectionType?: SelectionType | undefined;
  minSelections?: number | undefined;
  maxSelections?: number | undefined;
  branchId?: string | undefined;
  options?: ModifierOptionInput[] | undefined;
  dependsOnOptionId?: string | null | undefined;
  groupType?: "ADDON" | "SUBSTITUTION" | undefined;
}

export interface UpdateModifierGroupInput {
  name?: string | undefined;
  selectionType?: SelectionType | undefined;
  minSelections?: number | undefined;
  maxSelections?: number | null | undefined;
  options?: ModifierOptionInput[] | undefined;
  dependsOnOptionId?: string | null | undefined;
  groupType?: "ADDON" | "SUBSTITUTION" | undefined;
}

export interface CreateTagInput {
  name: string;
  color?: string | undefined;
}

const assertNoCircularDependency = async (
  tenantId: string,
  groupId: string,
  dependsOnOptionId: string | null | undefined,
) => {
  if (!dependsOnOptionId) return;

  const visitedGroupIds = new Set<string>([groupId]);
  let prerequisiteOptionId: string | null | undefined = dependsOnOptionId;

  while (prerequisiteOptionId) {
    const prerequisite = await modifierRepository.findModifierOption(
      tenantId,
      prerequisiteOptionId,
    );
    if (!prerequisite) throw modifierOptionNotFound(prerequisiteOptionId);

    if (visitedGroupIds.has(prerequisite.modifierGroupId)) {
      throw new ValidationError("Circular modifier group dependency");
    }
    visitedGroupIds.add(prerequisite.modifierGroupId);

    const prerequisiteGroup = await modifierRepository.findModifierGroup(
      tenantId,
      prerequisite.modifierGroupId,
    );
    prerequisiteOptionId = prerequisiteGroup?.dependsOnOptionId ?? null;
  }
};

const withStringPrice = (
  option: ModifierOptionInput,
): Omit<ModifierOptionInput, "additionalPrice" | "variantPrices"> & {
  additionalPrice: string;
  variantPrices?:
    Array<{ variantId: string; additionalPrice: string }> | undefined;
} => {
  const { additionalPrice, variantPrices, ...rest } = option;
  return {
    ...rest,
    additionalPrice: String(additionalPrice),
    ...(variantPrices !== undefined
      ? {
          variantPrices: variantPrices.map((price) => ({
            ...price,
            additionalPrice: String(price.additionalPrice),
          })),
        }
      : {}),
  };
};

export const modifierService = {
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
    if (!created) throw new InternalError("Modifier group could not be created");
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

  async listTags(auth: AuthContext) {
    requirePermission(auth, "menu:read");
    return modifierRepository.findTags(auth.tenantId);
  },

  async createTag(auth: AuthContext, input: CreateTagInput) {
    requirePermission(auth, "menu:create");
    const created = await modifierRepository.createTag(
      auth.tenantId,
      input.name,
      input.color,
    );
    await menuChangeLog.record(
      auth,
      "TAG",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async deleteTag(auth: AuthContext, tagId: string) {
    requirePermission(auth, "menu:delete");
    await modifierRepository.deleteTag(auth.tenantId, tagId);
    await menuChangeLog.record(auth, "TAG", tagId, "DELETED", {});
  },

  async listAllergens() {
    return modifierRepository.findAllergens();
  },
};
