import type { AuthContext } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { roleService } from "./role.service";
import { toRoleResponse } from "./role.mapper";

export const roleController = {
  async list(auth: AuthContext) {
    return successResponse((await roleService.list(auth)).map(toRoleResponse));
  },
  async create(
    auth: AuthContext,
    body: Parameters<typeof roleService.create>[1],
  ) {
    return createdResponse(
      toRoleResponse(await roleService.create(auth, body)),
    );
  },
  async update(
    auth: AuthContext,
    id: string,
    body: Parameters<typeof roleService.update>[2],
  ) {
    return successResponse(
      toRoleResponse(await roleService.update(auth, id, body)),
    );
  },
  async archive(auth: AuthContext, id: string) {
    await roleService.archive(auth, id);
    return successResponse(null);
  },
};
