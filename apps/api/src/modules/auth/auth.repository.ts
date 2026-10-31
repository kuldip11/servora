import { authRoleRepository } from "./auth-role.repository";
import { authSessionRepository } from "./auth-session.repository";
import { authUserRepository } from "./auth-user.repository";

/** Stable persistence facade for authentication services. */
export const authRepository = {
  ...authUserRepository,
  ...authRoleRepository,
  ...authSessionRepository,
};
