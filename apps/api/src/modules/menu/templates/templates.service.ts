import { InternalError } from "@/core/errors";
import type { AuthContext } from "@/core/auth";
import { templatesRepository } from "./templates.repository";
import { requirePermission } from "@/core/auth";
import { resolveMenuBranch } from "@/modules/menu/menu-authorization";
import { templateNotFound, templateCategoryNotFound } from "./templates.errors";
import {
  buildDiff,
  menuChangeLog,
} from "@/modules/menu/change-log/menu-change-log";

export const templatesService = {
  async list(auth: AuthContext) {
    requirePermission(auth, "menu:read");
    return templatesRepository.findMany(auth.tenantId);
  },

  async get(auth: AuthContext, templateId: string) {
    requirePermission(auth, "menu:read");
    const template = await templatesRepository.findById(
      auth.tenantId,
      templateId,
    );
    if (!template) throw templateNotFound(templateId);
    return template;
  },

  async createFromCategory(
    auth: AuthContext,
    categoryId: string,
    name: string,
    description?: string | undefined,
  ) {
    requirePermission(auth, "menu:create");
    const category = await templatesRepository.findCategory(
      auth.tenantId,
      categoryId,
    );
    if (!category) throw templateCategoryNotFound(categoryId);

    const items = await templatesRepository.findTenantWideCategoryItems(
      auth.tenantId,
      categoryId,
    );

    const created = await templatesRepository.createFromCategory(
      auth.tenantId,
      category,
      name,
      description,
      items,
    );
    if (!created) throw new InternalError("Menu template could not be created");
    await menuChangeLog.record(
      auth,
      "TEMPLATE",
      created.id,
      "CREATED",
      buildDiff(null, created),
    );
    return created;
  },

  async apply(
    auth: AuthContext,
    templateId: string,
    options: {
      branchId?: string | undefined;
      categoryName?: string | undefined;
    },
  ) {
    requirePermission(auth, "menu:create");
    const branchId = resolveMenuBranch(auth, options.branchId);
    const template = await templatesRepository.findById(
      auth.tenantId,
      templateId,
    );
    if (!template) throw templateNotFound(templateId);

    const result = await templatesRepository.apply(auth.tenantId, template, {
      ...options,
      branchId,
    });
    await menuChangeLog.record(auth, "TEMPLATE", templateId, "UPDATED", {
      operation: "APPLIED",
      branchId,
      categoryName: options.categoryName ?? null,
    });
    return result;
  },

  async delete(auth: AuthContext, templateId: string) {
    requirePermission(auth, "menu:delete");
    const deleted = await templatesRepository.delete(auth.tenantId, templateId);
    if (!deleted) throw templateNotFound(templateId);
    await menuChangeLog.record(auth, "TEMPLATE", templateId, "DELETED", {
      deleted,
    });
  },
};
