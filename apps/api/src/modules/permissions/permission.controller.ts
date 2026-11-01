import type { AuthContext } from "@/core/auth";
import { successResponse } from "@/core/response";
import { permissionService } from "./permission.service";
import {
  toPermissionResponse,
  toRoleWithPermissionsResponse,
} from "./permission.mapper";

export const permissionController = {
  async list(auth: AuthContext) {
    return successResponse(
      (await permissionService.list(auth)).map(toPermissionResponse),
    );
  },
  async forRole(auth: AuthContext, id: string) {
    return successResponse(
      (await permissionService.forRole(auth, id)).map(toPermissionResponse),
    );
  },
  async setForRole(auth: AuthContext, id: string, permissionIds: string[]) {
    return successResponse(
      toRoleWithPermissionsResponse(
        await permissionService.setForRole(auth, id, permissionIds),
      ),
    );
  },
};
