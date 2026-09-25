import { isAxiosError } from "axios";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { restoreActiveContext } from "@/shared/auth/active-context";

export type AuthBootstrapResult = "ready" | "unauthenticated" | "unavailable";

export const AUTH_BOOTSTRAP_TIMEOUT_MS = 75_000;

export const bootstrapAuthSession = async (): Promise<AuthBootstrapResult> => {
  const initialVersion = useAuthStore.getState().contextVersion;
  const currentResult = (): AuthBootstrapResult =>
    useAuthStore.getState().isAuthenticated ? "ready" : "unauthenticated";
  try {
    const result = await authService.refresh({
      timeout: AUTH_BOOTSTRAP_TIMEOUT_MS,
    });
    if (useAuthStore.getState().contextVersion !== initialVersion)
      return currentResult();
    useAuthStore.getState().setAuth(result);
    const sessionVersion = useAuthStore.getState().contextVersion;

    try {
      const memberships = await authService.memberships();
      if (useAuthStore.getState().contextVersion !== sessionVersion)
        return currentResult();
      if (memberships?.length) await restoreActiveContext(memberships);
    } catch (error) {
      if (useAuthStore.getState().contextVersion !== sessionVersion)
        return currentResult();
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) {
        useAuthStore.getState().logout();
        return "unauthenticated";
      }
      // The refreshed account remains signed in; /business can recover context.
    }

    return currentResult();
  } catch (error) {
    if (useAuthStore.getState().contextVersion !== initialVersion)
      return currentResult();
    const status = isAxiosError(error) ? error.response?.status : undefined;

    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
      return "unauthenticated";
    }

    return "unavailable";
  }
};
