import { Elysia } from "elysia";
import { requireAuthPlugin } from "@/core/auth";
import { authController } from "./auth.controller";
import { authService } from "./auth.service";
import { successResponse } from "@/core/response";
import { invalidRefreshToken } from "./auth.errors";
import {
  clearRefreshCookie,
  readRefreshCookie,
  serializeRefreshCookie,
} from "./auth-cookie";
import { AUTH_APP_HEADER, parseAuthApp } from "./auth-app";
import { assertTrustedAuthOrigin } from "./auth-origin";
import {
  signupBody,
  loginBody,
  profileBody,
  changePasswordBody,
  sessionIdParams,
} from "./auth.validator";
import {
  authMeResponseSchema,
  authSessionsResponseSchema,
  authTokenResponseSchema,
  logoutResponseSchema,
  membershipsResponseSchema,
  passwordChangedResponseSchema,
  sessionRevokedResponseSchema,
  signupResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";

export const authRouter = new Elysia()
  .post("/api/auth/signup", ({ body }) => authController.signup(body), {
    body: signupBody,
    response: { 200: signupResponseSchema, ...standardErrorResponseSchemas },
  })
  .post(
    "/api/auth/login",
    async ({ body, headers, set }) => {
      assertTrustedAuthOrigin(headers.origin);
      const app = parseAuthApp(headers[AUTH_APP_HEADER]);
      const { refreshToken, ...result } = await authService.login(body, app);
      set.headers["set-cookie"] = serializeRefreshCookie(refreshToken, app);
      return successResponse(result);
    },
    {
      body: loginBody,
      response: {
        200: authTokenResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/auth/refresh",
    async ({ headers, set }) => {
      assertTrustedAuthOrigin(headers.origin);
      const app = parseAuthApp(headers[AUTH_APP_HEADER]);
      const refreshToken = readRefreshCookie(headers.cookie, app);
      if (!refreshToken) throw invalidRefreshToken();
      const { refreshToken: nextRefreshToken, ...result } =
        await authService.refresh(refreshToken, app);
      set.headers["set-cookie"] = serializeRefreshCookie(nextRefreshToken, app);
      return successResponse(result);
    },
    {
      response: {
        200: authTokenResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/api/auth/logout",
    async ({ headers, set }) => {
      assertTrustedAuthOrigin(headers.origin);
      const app = parseAuthApp(headers[AUTH_APP_HEADER]);
      const refreshToken = readRefreshCookie(headers.cookie, app);
      if (refreshToken) await authService.logout(refreshToken);
      set.headers["set-cookie"] = clearRefreshCookie(app);
      return successResponse({ loggedOut: true });
    },
    {
      response: { 200: logoutResponseSchema, ...standardErrorResponseSchemas },
    },
  );

export const authMeRouter = new Elysia()
  .use(requireAuthPlugin())
  .get("/api/auth/me", ({ auth }) => authController.me(auth), {
    response: { 200: authMeResponseSchema, ...standardErrorResponseSchemas },
  })
  .patch(
    "/api/auth/me",
    ({ auth, body }) => authController.updateProfile(auth, body),
    {
      body: profileBody,
      response: { 200: authMeResponseSchema, ...standardErrorResponseSchemas },
    },
  )
  .post(
    "/api/auth/me/change-password",
    ({ auth, body }) => authController.changePassword(auth, body),
    {
      body: changePasswordBody,
      response: {
        200: passwordChangedResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get(
    "/api/auth/memberships",
    ({ auth }) => authController.memberships(auth),
    {
      response: {
        200: membershipsResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .get("/api/auth/sessions", ({ auth }) => authController.sessions(auth), {
    response: {
      200: authSessionsResponseSchema,
      ...standardErrorResponseSchemas,
    },
  })
  .delete(
    "/api/auth/sessions/:id",
    ({ auth, params }) => authController.revokeSession(auth, params.id),
    {
      params: sessionIdParams,
      response: {
        200: sessionRevokedResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
