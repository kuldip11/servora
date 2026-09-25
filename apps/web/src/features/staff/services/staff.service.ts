import {
  createStaffApi,
  type StaffRowDto,
  type UpdateStaffInput,
  type StaffListFilters,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const staffApi = createStaffApi(apiClient);
export type StaffRow = StaffRowDto;

export interface StaffFormInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
  branchId?: string | undefined;
}

export const staffService = {
  list: (filters: StaffListFilters = {}, signal?: AbortSignal) =>
    staffApi.listStaff(filters, signal),
  async add(input: StaffFormInput): Promise<void> {
    await staffApi.addStaff({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
      roleId: input.roleId,
      branchIds: input.branchId ? [input.branchId] : [],
    });
  },
  remove: staffApi.removeStaff,
  updateStatus: staffApi.updateStaffStatus,
  update(id: string, input: UpdateStaffInput): Promise<void> {
    return staffApi.updateStaff(id, input);
  },
};
