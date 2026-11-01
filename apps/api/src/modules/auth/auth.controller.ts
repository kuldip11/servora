import type { AuthContext } from "@/core/auth";
import { successResponse } from "@/core/response";
import { authService } from "./auth.service";
import type {
  SignupRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@pos/contracts";
import {
  toAuthSessionResponse,
  toMembershipSummaryResponse,
} from "./auth.mapper";

export const authController = {
  async signup(input: SignupRequest) {
    const result = await authService.signup(input);
    return successResponse(result);
  },

  async memberships(auth: AuthContext) {
    return successResponse(
      (await authService.memberships(auth.userId, auth.app ?? "web")).map(
        toMembershipSummaryResponse,
      ),
    );
  },

  async sessions(auth: AuthContext) {
    return successResponse(
      (await authService.sessions(auth.userId)).map(toAuthSessionResponse),
    );
  },

  async revokeSession(auth: AuthContext, sessionId: string) {
    return successResponse(
      await authService.revokeSession(auth.userId, sessionId),
    );
  },

  async updateProfile(auth: AuthContext, input: UpdateProfileRequest) {
    await authService.updateProfile(auth.userId, input);
    return authController.me(auth);
  },

  async changePassword(auth: AuthContext, input: ChangePasswordRequest) {
    await authService.changePassword(auth.userId, input);
    return successResponse({ changed: true });
  },

  async me(auth: AuthContext) {
    const { user, membership } = await authService.me(
      auth.userId,
      auth.membershipId,
    );
    const membershipRoles = membership
      ? membership.roles.map((mr) => ({
          id: mr.roleId,
          name: mr.role.name,
          permissions: mr.role.rolePermissions.map((rp) => rp.permission),
        }))
      : [];
    const globalRoles = user.globalUserRoles.map((ur) => ({
      id: ur.roleId,
      name: ur.role.name,
      permissions: ur.role.rolePermissions.map((rp) => rp.permission),
    }));
    const roles = membership ? membershipRoles : globalRoles;

    return successResponse({
      id: user.id,
      tenantId: auth.tenantId,
      ...(auth.membershipId ? { membershipId: auth.membershipId } : {}),
      branchId: auth.branchId,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      status: user.status,
      roles,
      permissions: auth.permissions,
    });
  },
};
