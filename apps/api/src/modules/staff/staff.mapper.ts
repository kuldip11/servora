import type { StaffMemberResponse } from "@pos/contracts";
import { InternalError } from "@/core/errors";
import { staffRepository } from "./staff.repository";

type StaffListRecord = Awaited<
  ReturnType<typeof staffRepository.findMany>
>[number];
type StaffMembershipRecord = NonNullable<
  Awaited<ReturnType<typeof staffRepository.findMembership>>
>;

type StaffResponseSource = StaffListRecord | StaffMembershipRecord;

const isListRecord = (value: StaffResponseSource): value is StaffListRecord =>
  "membershipId" in value && "assignedBranches" in value;

export const toStaffMemberResponse = (
  value: StaffResponseSource | null | undefined,
): StaffMemberResponse => {
  if (!value) throw new InternalError("Staff response could not be loaded");

  if (isListRecord(value)) {
    return {
      id: value.id,
      membershipId: value.membershipId,
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      status: value.status,
      assignedBranches: value.assignedBranches.map((branch) => ({
        id: branch.id,
        name: branch.name,
      })),
      roles: value.roles.map((role) => ({
        id: role.id,
        name: role.name,
        scope: role.scope,
      })),
    };
  }

  if (!value.user) throw new InternalError("Staff membership has no user");

  return {
    id: value.userId,
    membershipId: value.id,
    firstName: value.user.firstName,
    lastName: value.user.lastName,
    email: value.user.email,
    status: value.status,
    assignedBranches: value.branches
      .map((item) => item.branch)
      .filter((branch): branch is NonNullable<typeof branch> => Boolean(branch))
      .map((branch) => ({ id: branch.id, name: branch.name })),
    roles: value.roles.map(({ role }) => ({
      id: role.id,
      name: role.name,
      scope: role.scope,
    })),
  };
};
