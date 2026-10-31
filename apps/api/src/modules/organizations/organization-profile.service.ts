import type { AuthContext } from "@/core/auth";
import { ForbiddenError } from "@/core/errors";
import { assertOrganizationManager } from "./organization-authorization";
import { organizationNotFound } from "./organization.errors";
import { organizationRepository } from "./organization.repository";

export const organizationProfileService = {
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
};
