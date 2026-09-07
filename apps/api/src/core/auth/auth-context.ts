import { Elysia } from "elysia";
import type { RoleName } from "@pos/types";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import { db } from "@/db";
import { resolveAuthorization, resolveMembership } from "./authorization";
import { resolveActiveBranch } from "./membership-context";
import {
  UnauthorizedError,
  ForbiddenError,
  MissingBranchError,
} from "@/core/errors";
import { createLogger, type Logger } from "@/core/logger";
import { requestContextPlugin } from "@/core/context";
import {
  AUTH_APP_HEADER,
  assertMembershipAppAccess,
  assertTokenApp,
  parseAuthApp,
  type AuthApp,
} from "@/modules/auth/auth-app";

export interface AuthContext {
  userId: string;
  app?: AuthApp;
  tenantId: string;

  membershipId?: string;

  branchId: string | null;
  email: string;
  roles: RoleName[];
  permissions: string[];
  tenantWide?: boolean;
  authorizedBranchIds?: string[];
  requestId?: string | undefined;
  ipAddress?: string | undefined;
}

const parseBearerToken = (authHeader: string | undefined): string => {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Authorization header missing or invalid");
  }
  return authHeader.slice(7);
};

export const requireAuthPlugin = () =>
  new Elysia({ name: "require-auth" })
    .use(requestContextPlugin())
    .derive(
      { as: "scoped" },
      async ({
        headers,
        requestContext,
      }): Promise<{ auth: AuthContext; logger: Logger }> => {
        const token = parseBearerToken(headers["authorization"]);

        let payload: JwtPayload;
        try {
          payload = verifyAccessToken(token);
        } catch {
          throw new UnauthorizedError("Invalid or expired token");
        }

        const requestApp = parseAuthApp(headers[AUTH_APP_HEADER]);
        assertTokenApp(payload.app, requestApp);

        const requestedTenant = headers["x-tenant-id"]?.trim() ?? "";
        const requestedBranch = headers["x-branch-id"]?.trim() ?? "";

        if (!requestedTenant) {
          if (requestedBranch && requestedBranch !== "all") {
            throw new ForbiddenError("Active franchise is required");
          }

          const auth: AuthContext = {
            userId: payload.sub,
            app: requestApp,
            tenantId: "",
            branchId: null,
            email: payload.email,
            roles: payload.roles as RoleName[],
            permissions: payload.permissions ?? [],
            tenantWide: true,
            authorizedBranchIds: [],
            requestId: requestContext.requestId,
            ipAddress: requestContext.ip,
          };

          const logger = createLogger(
            { requestId: requestContext.requestId, userId: auth.userId },
            "app",
          );
          return { auth, logger };
        }

        const membership = await resolveMembership(
          db,
          payload.sub,
          requestedTenant,
        );
        if (!membership) {
          throw new ForbiddenError("Franchise access denied");
        }

        const baseContext = {
          userId: payload.sub,
          membershipId: membership.id,
          tenantId: membership.tenantId,
        };

        let branchId: string | null = null;
        if (requestedBranch && requestedBranch !== "all") {
          const active = await resolveActiveBranch(
            db,
            baseContext,
            requestedBranch,
          );
          branchId = active.branchId ?? null;
        } else if (requestedBranch === "all") {
          const decision = await resolveAuthorization(db, baseContext);
          if (!decision.allowed || !decision.tenantWide) {
            throw new ForbiddenError("Branch access denied");
          }
        }

        const decision = await resolveAuthorization(db, {
          ...baseContext,
          branchId,
        });
        if (!decision.allowed) {
          throw new ForbiddenError("Franchise access denied");
        }

        assertMembershipAppAccess(
          requestApp,
          membership.roles.map((item) => ({
            name: item.role?.name ?? item.roleId,
            isSystem: item.role?.isSystem ?? false,
          })),
          decision.permissionKeys,
        );

        const roles = [
          ...new Set(
            membership.roles.map((item) => item.role?.name ?? item.roleId),
          ),
        ] as RoleName[];

        const auth: AuthContext = {
          userId: payload.sub,
          app: requestApp,
          tenantId: membership.tenantId,
          membershipId: membership.id,
          branchId,
          email: payload.email,
          roles,
          permissions: decision.permissionKeys,
          tenantWide: decision.tenantWide,
          authorizedBranchIds: decision.branchIds,
          requestId: requestContext.requestId,
          ipAddress: requestContext.ip,
        };

        const logger = createLogger(
          {
            requestId: requestContext.requestId,
            tenantId: auth.tenantId,
            ...(auth.branchId ? { branchId: auth.branchId } : {}),
            userId: auth.userId,
          },
          "app",
        );

        return { auth, logger };
      },
    );

export const requireRoles = (auth: AuthContext, allowed: RoleName[]): void => {
  const hasRole = allowed.some((role) => auth.roles.includes(role));
  if (!hasRole)
    throw new ForbiddenError("Insufficient permissions", {
      required: allowed,
      actual: auth.roles,
    });
};

export const requirePermission = (
  auth: AuthContext,
  permission: string,
): void => {
  if (!auth.tenantId) {
    if (permission === "tenant:read" || permission === "tenant:create") return;
    throw new ForbiddenError("Tenant context required");
  }

  if (!auth.permissions.includes(permission)) {
    throw new ForbiddenError("Insufficient permissions", {
      required: permission,
    });
  }
};

export const requireBranch = (
  auth: AuthContext,
  message = "Please select a specific branch.",
): string => {
  if (!auth.branchId) throw new MissingBranchError(message);
  return auth.branchId;
};
