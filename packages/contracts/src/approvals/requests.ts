import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const approvalActionSchema = Type.Union([
  Type.Literal("VOID"),
  Type.Literal("COMP"),
]);

export const approvalThresholdParamsSchema = Type.Object({
  actionType: approvalActionSchema,
});

export const approvalThresholdUpsertBodySchema = Type.Object(
  {
    thresholdAmount: Type.Number({ minimum: 0 }),
    requiresRole: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  },
  { additionalProperties: false },
);

export const managerApprovalIssueBodySchema = Type.Object(
  {
    actionType: approvalActionSchema,
    orderId: uuidSchema,
    orderItemId: uuidSchema,
    managerEmail: Type.String({
      maxLength: 320,
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    }),
    password: Type.String({ minLength: 1, maxLength: 1024 }),
  },
  { additionalProperties: false },
);

export type ApprovalAction = Static<typeof approvalActionSchema>;
export type ApprovalThresholdParams = Static<
  typeof approvalThresholdParamsSchema
>;
export type ApprovalThresholdUpsertBody = Static<
  typeof approvalThresholdUpsertBodySchema
>;
export type ManagerApprovalIssueBody = Static<
  typeof managerApprovalIssueBodySchema
>;
