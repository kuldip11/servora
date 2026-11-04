import { env } from "@/config/env";
export const assistantEnabledForBranch = (branchId: string) =>
  env.ASSISTANT_ENABLED === "true" &&
  Boolean(env.AI_GATEWAY_API_KEY && env.ASSISTANT_MODEL) &&
  env.ASSISTANT_BRANCH_IDS.split(",")
    .map((id) => id.trim())
    .includes(branchId);
