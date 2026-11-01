import { createLogger, toError } from "@/core/logger/logger";
import { InternalError } from "@/core/errors";
import { metrics } from "@/core/observability/metrics";
import { inventoryDeductionJobRepository } from "./inventory-deduction-job.repository";
import { inventoryRecipeService } from "./inventory-recipe.service";
import { inventoryStockService } from "./inventory-stock.service";
import type { InventoryOrderItemInput } from "./inventory.types";

export type {
  CreateInventoryItemInput,
  InventoryOrderItemInput,
  RecipeNeedItemInput,
  UpdateStockInput,
} from "./inventory.types";
export { weightRecipeScale } from "./inventory-recipe.engine";

const inventoryLogger = createLogger({}, "inventory");

export const processInventoryDeductionJob = async (jobId: string) => {
  const claimed = await inventoryDeductionJobRepository.markProcessing(jobId);
  if (!claimed) {
    const existing = await inventoryDeductionJobRepository.findById(jobId);
    if (existing?.status === "COMPLETED") return;
    return;
  }

  const items: InventoryOrderItemInput[] = claimed.items.map((item) => ({
    orderItemId: item.orderItemId,
    menuItemId: item.menuItemId,
    variantId: item.variantId,
    quantity: item.quantity,
    weightQuantity: item.weightQuantity,
    weightUnit: item.weightUnit,
    selectedOptions: item.selectedOptions,
  }));

  try {
    const result = await inventoryRecipeService.deductForOrderItems(
      claimed.tenantId,
      claimed.branchId,
      claimed.orderId,
      claimed.kitchenTicketId,
      items,
      claimed.performedBy,
    );
    await inventoryDeductionJobRepository.markCompleted(claimed.id);
    return result;
  } catch (error) {
    const attemptCount = claimed.attemptCount + 1;
    await inventoryDeductionJobRepository.markFailed(
      claimed.id,
      attemptCount,
      toError(error).message,
    );
    throw error;
  }
};

const deductForOrderItemsWithRetry = async (
  tenantId: string,
  branchId: string,
  orderId: string,
  kitchenTicketId: string,
  items: InventoryOrderItemInput[],
  performedBy: string | null,
  maxAttempts = 3,
) => {
  const job = await inventoryDeductionJobRepository.enqueue({
    tenantId,
    branchId,
    orderId,
    kitchenTicketId,
    items,
    performedBy,
  });
  if (!job) {
    throw new InternalError(
      "Inventory deduction recovery job could not be created",
    );
  }
  if (job.status === "COMPLETED") return;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await processInventoryDeductionJob(job.id);
      const refreshed = await inventoryDeductionJobRepository.findById(job.id);
      if (refreshed?.status === "COMPLETED") return result;
    } catch (error) {
      lastError = error;
      metrics.increment("servora_order_processing_errors_total", {
        stage: "inventory_deduction",
      });
      inventoryLogger.error(
        attempt === maxAttempts
          ? "inventory.deduction_deferred"
          : "inventory.deduction_retry",
        toError(error),
        {
          jobId: job.id,
          orderId,
          kitchenTicketId,
          branchId,
          attempt,
          maxAttempts,
        },
      );
    }
  }

  // The durable job remains FAILED with nextAttemptAt populated. The recovery
  // worker will continue retrying after this request has completed or restarted.
  throw toError(lastError ?? new Error("Inventory deduction was deferred"));
};

export const inventoryService = {
  ...inventoryStockService,
  ...inventoryRecipeService,
  deductForOrderItemsWithRetry,
};
