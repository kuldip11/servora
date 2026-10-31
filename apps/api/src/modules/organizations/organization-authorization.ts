import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { organizationNotFound } from "./organization.errors";
import { organizationRepository } from "./organization.repository";

export const assertOrganizationManager = async (
  auth: AuthContext,
  organizationId: string,
) => {
  const membership = await organizationRepository.findMembership(
    auth.userId,
    organizationId,
  );
  if (!membership) throw organizationNotFound(organizationId);
  requirePermission(auth, "organization:manage");
};
