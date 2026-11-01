import { lazy } from "react";
export const KitchenLogin = lazy(() =>
  import("./pages/KitchenLogin").then((module) => ({
    default: module.KitchenLogin,
  })),
);
export { useLogin } from "./hooks/useLogin";
export { getToken, logout } from "@/shared/auth/storage";
export type { Branch, CredentialsForm } from "./types";

export { logoutSession, restoreSession } from "./api/login";
