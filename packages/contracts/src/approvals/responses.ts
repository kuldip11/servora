import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import { approvalActionSchema } from "./requests";

export const approvalThresholdSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    actionType: approvalActionSchema,
    thresholdAmount: Type.String({ pattern: "^-?\\d+(?:\\.\\d{1,2})?$" }),
    requiresRole: Type.String({ minLength: 1, maxLength: 50 }),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const approvalThresholdListResponseSchema = successResponseSchema(
  Type.Array(approvalThresholdSchema),
);
export const approvalThresholdResponseSchema = successResponseSchema(
  approvalThresholdSchema,
);

export const managerApprovalTokenSchema = Type.Object(
  {
    token: uuidSchema,
    expiresAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const managerApprovalTokenResponseSchema = successResponseSchema(
  managerApprovalTokenSchema,
);

export type ApprovalThreshold = Static<typeof approvalThresholdSchema>;
export type ManagerApprovalToken = Static<typeof managerApprovalTokenSchema>;
