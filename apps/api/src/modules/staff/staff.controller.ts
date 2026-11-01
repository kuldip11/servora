import type { AuthContext } from "@/core/auth";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/core/response";
import type {
  CreateStaffRequest,
  StaffListQuery,
  UpdateStaffRequest,
} from "@pos/contracts";
import { staffService } from "./staff.service";
import { toStaffMemberResponse } from "./staff.mapper";

export const staffController = {
  async list(auth: AuthContext, filters: StaffListQuery = {}) {
    const result = await staffService.list(auth, filters);
    return paginatedResponse(result.items.map(toStaffMemberResponse), {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },

  async create(auth: AuthContext, input: CreateStaffRequest) {
    const staffMember = await staffService.create(auth, input);
    return createdResponse(toStaffMemberResponse(staffMember));
  },

  async update(auth: AuthContext, id: string, input: UpdateStaffRequest) {
    const updated = await staffService.update(auth, id, input);
    return successResponse(toStaffMemberResponse(updated));
  },

  async remove(auth: AuthContext, id: string) {
    await staffService.remove(auth, id);
    return successResponse(null);
  },

  async listRoles(auth: AuthContext) {
    const allRoles = await staffService.listRoles(auth);
    return successResponse(allRoles);
  },
};
