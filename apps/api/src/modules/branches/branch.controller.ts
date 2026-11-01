import type { CreateBranchRequest, UpdateBranchRequest } from "@pos/contracts";
import type { AuthContext } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import { toBranchResponse, toBranchTakeawayQrResponse } from "./branch.mapper";
import { branchService } from "./branch.service";

export const branchController = {
  async list(auth: AuthContext) {
    const branches = await branchService.list(auth);
    return successResponse(branches.map(toBranchResponse));
  },

  async create(auth: AuthContext, input: CreateBranchRequest) {
    const branch = await branchService.create(auth, input);
    return createdResponse(toBranchResponse(branch));
  },

  async update(
    auth: AuthContext,
    branchId: string,
    changes: UpdateBranchRequest,
  ) {
    const updated = await branchService.update(auth, branchId, changes);
    return successResponse(toBranchResponse(updated));
  },

  async getTakeawayQr(auth: AuthContext, branchId: string) {
    return successResponse(
      toBranchTakeawayQrResponse(
        await branchService.getTakeawayQr(auth, branchId),
      ),
    );
  },

  async regenerateTakeawayQr(auth: AuthContext, branchId: string) {
    return successResponse(
      toBranchTakeawayQrResponse(
        await branchService.regenerateTakeawayQr(auth, branchId),
      ),
    );
  },

  async deactivate(auth: AuthContext, branchId: string) {
    await branchService.deactivate(auth, branchId);
    return successResponse(null);
  },
};
