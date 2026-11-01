import type {
  AuthSessionResponse,
  MembershipSummaryResponse,
} from "@pos/contracts";
import type { authRepository } from "./auth.repository";
import type { AvailableMembership } from "@pos/types";

type SessionRecord = Awaited<
  ReturnType<typeof authRepository.listActiveSessions>
>[number];

export const toAuthSessionResponse = (
  session: SessionRecord,
): AuthSessionResponse => ({
  id: session.id,
  userId: session.userId,
  createdAt: session.createdAt.toISOString(),
  lastSeenAt: session.lastSeenAt.toISOString(),
  expiresAt: session.expiresAt.toISOString(),
  revokedAt: session.revokedAt?.toISOString() ?? null,
  userAgent: session.userAgent,
  ipAddress: session.ipAddress,
});

export const toMembershipSummaryResponse = (
  membership: AvailableMembership,
): MembershipSummaryResponse => ({
  membershipId: membership.membershipId,
  tenant: {
    id: membership.tenant.id,
    name: membership.tenant.name,
  },
  roles: membership.roles.map((role) => ({
    id: role.id,
    name: role.name,
    scope: role.scope,
  })),
  branches: membership.branches.map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    isActive: branch.isActive,
    tablesEnabled: branch.tablesEnabled ?? false,
  })),
});
