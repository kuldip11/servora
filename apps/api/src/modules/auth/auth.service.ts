import { authAuthenticationService } from "./auth-authentication.service";
import { authProfileService } from "./auth-profile.service";
import { authSessionService } from "./auth-session.service";

export const authService = {
  ...authAuthenticationService,
  ...authSessionService,
  ...authProfileService,
};
