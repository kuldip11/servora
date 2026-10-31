import type { AuthContext } from "@/core/auth";
import { writeAudit } from "@/core/audit";
import { NotFoundError } from "@/core/errors";
import { assertOrganizationManager } from "./organization-authorization";
import { normalizeOrganizationMenuInput } from "./organization-menu-normalization";
import type { OrganizationMenuInput } from "./organization-menu.types";
import { organizationRepository } from "./organization.repository";

export const organizationMenuService = {
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
      ...normalizeOrganizationMenuInput(input),
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
        ? normalizeOrganizationMenuInput({
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
