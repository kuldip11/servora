import { createAuthApi, type AuthResponse } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const authApi = createAuthApi(apiClient);
export type { AuthResponse };

export const authService = {
  signup: authApi.signup,
  login: authApi.login,
  refresh: authApi.refresh,
  logout: authApi.logout,
  memberships: authApi.memberships,
  organizations: authApi.organizations,
  createOrganization: authApi.createOrganization,
  createTenant: authApi.createTenant,
  updateTenant: authApi.updateTenant,
  archiveTenant: authApi.archiveTenant,
  me: authApi.me,
  updateProfile: authApi.updateProfile,
  changePassword: authApi.changePassword,
};
