import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";
import {
  paginatedResponseSchema,
  successResponseSchema,
} from "../common/responses";
import { publicRoleScopeSchema } from "../roles/responses";
import { staffStatusSchema } from "./requests";

export const staffBranchSummarySchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
  },
  { additionalProperties: false },
);

export const staffRoleSummarySchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    scope: publicRoleScopeSchema,
  },
  { additionalProperties: false },
);

export const staffMemberSchema = Type.Object(
  {
    id: uuidSchema,
    membershipId: uuidSchema,
    firstName: Type.String(),
    lastName: Type.String(),
    email: Type.String({ format: "email" }),
    status: staffStatusSchema,
    assignedBranches: Type.Array(staffBranchSummarySchema),
    roles: Type.Array(staffRoleSummarySchema),
  },
  { additionalProperties: false },
);

export const staffListResponseSchema =
  paginatedResponseSchema(staffMemberSchema);
export const staffMemberResponseSchema =
  successResponseSchema(staffMemberSchema);
export const staffRemoveResponseSchema = successResponseSchema(Type.Null());

export type StaffMemberResponse = Static<typeof staffMemberSchema>;
