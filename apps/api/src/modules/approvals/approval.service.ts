import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { ForbiddenError, ValidationError } from "@/core/errors";
import { writeAudit } from "@/core/audit";
import { db } from "@/db";
import { approvalRoleMatches, isApprovalRequired } from "./approval-policy";
import {
  managerApprovalTokens,
  users,
  voidCompApprovalThresholds,
} from "@/db/schema";

export type ApprovalAction = "VOID" | "COMP";
export const approvalService = {
  list(auth: AuthContext) {
    requirePermission(auth, "orders:update");
    return db.query.voidCompApprovalThresholds.findMany({
      where: eq(voidCompApprovalThresholds.tenantId, auth.tenantId),
    });
  },
  async upsert(
    auth: AuthContext,
    actionType: ApprovalAction,
    thresholdAmount: number,
    requiresRole = "Manager",
  ) {
    requirePermission(auth, "settings:update");
    if (!Number.isFinite(thresholdAmount) || thresholdAmount < 0)
      throw new ValidationError("Threshold must be zero or greater");
    const normalizedRole = requiresRole.trim();
    if (!normalizedRole) throw new ValidationError("Approval role is required");
    const [row] = await db
      .insert(voidCompApprovalThresholds)
      .values({
        tenantId: auth.tenantId,
        actionType,
        thresholdAmount: thresholdAmount.toFixed(2),
        requiresRole: normalizedRole,
      })
      .onConflictDoUpdate({
        target: [
          voidCompApprovalThresholds.tenantId,
          voidCompApprovalThresholds.actionType,
        ],
        set: {
          thresholdAmount: thresholdAmount.toFixed(2),
          requiresRole: normalizedRole,
          updatedAt: new Date(),
        },
      })
      .returning();
    await writeAudit({
      tenantId: auth.tenantId,
      userId: auth.userId,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "VOID_COMP_THRESHOLD_UPDATED",
      entity: "void_comp_approval_threshold",
      entityId: row!.id,
      metadata: { actionType, thresholdAmount, requiresRole: normalizedRole },
    });
    return row!;
  },
  async issue(
    auth: AuthContext,
    input: {
      actionType: ApprovalAction;
      orderId: string;
      orderItemId: string;
      managerEmail: string;
      password: string;
    },
  ) {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, input.managerEmail.trim().toLowerCase()),
        isNull(users.deletedAt),
      ),
      with: {
        memberships: {
          with: {
            roles: {
              with: {
                role: {
                  with: { rolePermissions: { with: { permission: true } } },
                },
              },
            },
          },
        },
      },
    });
    const membership = user?.memberships.find(
      (entry) => entry.tenantId === auth.tenantId && entry.status === "ACTIVE",
    );
    const threshold = await db.query.voidCompApprovalThresholds.findFirst({
      where: and(
        eq(voidCompApprovalThresholds.tenantId, auth.tenantId),
        eq(voidCompApprovalThresholds.actionType, input.actionType),
      ),
    });
    const requiredRole = (threshold?.requiresRole ?? "Manager")
      .trim()
      .toLowerCase();
    const permission =
      input.actionType === "VOID" ? "orders:void" : "orders:comp";
    const authorized = membership?.roles.some((entry) => {
      const roleMatches = approvalRoleMatches(entry.role.name, requiredRole);
      return (
        entry.role.isActive &&
        roleMatches &&
        entry.role.rolePermissions.some(
          (rp) => rp.permission.key === permission,
        )
      );
    });
    if (
      !user ||
      !authorized ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    )
      throw new ForbiddenError("Manager approval credentials are invalid");
    const [token] = await db
      .insert(managerApprovalTokens)
      .values({
        tenantId: auth.tenantId,
        approvedBy: user.id,
        actionType: input.actionType,
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      })
      .returning();
    await writeAudit({
      tenantId: auth.tenantId,
      userId: user.id,
      branchId: auth.branchId,
      requestId: auth.requestId,
      ipAddress: auth.ipAddress,
      action: "MANAGER_APPROVAL_GRANTED",
      entity: "manager_approval_token",
      entityId: token!.id,
      metadata: {
        actionType: input.actionType,
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        requestedBy: auth.userId,
        requiresRole: threshold?.requiresRole ?? "Manager",
      },
    });
    return { token: token!.id, expiresAt: token!.expiresAt };
  },
  async assertApproved(
    tenantId: string,
    actionType: ApprovalAction,
    orderId: string,
    orderItemId: string,
    lineValue: number,
    tokenId?: string,
  ) {
    const threshold = await db.query.voidCompApprovalThresholds.findFirst({
      where: and(
        eq(voidCompApprovalThresholds.tenantId, tenantId),
        eq(voidCompApprovalThresholds.actionType, actionType),
      ),
    });
    if (
      !isApprovalRequired(
        lineValue,
        threshold ? Number(threshold.thresholdAmount) : null,
      )
    )
      return;
    if (!tokenId) throw new ForbiddenError("Manager approval required");
    const [used] = await db
      .update(managerApprovalTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(managerApprovalTokens.id, tokenId),
          eq(managerApprovalTokens.tenantId, tenantId),
          eq(managerApprovalTokens.actionType, actionType),
          eq(managerApprovalTokens.orderId, orderId),
          eq(managerApprovalTokens.orderItemId, orderItemId),
          isNull(managerApprovalTokens.usedAt),
          gt(managerApprovalTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!used)
      throw new ForbiddenError(
        "Manager approval is invalid, expired, or already used",
      );
  },
};
