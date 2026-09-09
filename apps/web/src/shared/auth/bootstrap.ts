import { isAxiosError } from "axios";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { restoreActiveContext } from "@/shared/auth/active-context";

export type AuthBootstrapResult = "ready" | "unauthenticated" | "unavailable";

export const bootstrapAuthSession = async (): Promise<AuthBootstrapResult> => {
  try {
    const result = await authService.refresh();
    useAuthStore.getState().setAuth(result);

    try {
      const memberships = await authService.memberships();
      if (memberships?.length) await restoreActiveContext(memberships);
    } catch {
      // The refreshed account remains signed in; /business can recover context.
    }

    return "ready";
  } catch (error) {
    const status = isAxiosError(error) ? error.response?.status : undefined;

    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
      return "unauthenticated";
    }

    return "unavailable";
  }
};
