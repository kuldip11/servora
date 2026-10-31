import { lazy } from "react";
export const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })),
);
export { useLogin } from "./hooks/useLogin";
export { getToken, getWaiterName, logout } from "@/shared/auth/storage";
export type { Branch, CredentialsForm } from "./types";

export { logoutSession, restoreSession } from "./api/login";
export { hasPermission } from "@/shared/auth/storage";
