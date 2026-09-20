import { createLogger, toError } from "@/core/logger/logger";
import { metrics } from "@/core/observability/metrics";
import { inventoryDeductionJobRepository } from "./inventory-deduction-job.repository";
import { processInventoryDeductionJob } from "./inventory.service";

const logger = createLogger({}, "inventory-deduction-worker");

export const recoverInventoryDeductionJobs = async () => {
  const jobs = await inventoryDeductionJobRepository.findRecoverable(100);
  for (const job of jobs) {
    try {
      await processInventoryDeductionJob(job.id);
    } catch (error) {
      metrics.increment("servora_order_processing_errors_total", {
        stage: "inventory_deduction_worker",
      });
      logger.error("inventory.deduction_worker_failed", toError(error), {
        jobId: job.id,
        orderId: job.orderId,
        kitchenTicketId: job.kitchenTicketId,
      });
    }
  }
};

export const startInventoryDeductionWorker = () => {
  let stopped = false;
  let running = false;

  const run = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await inventoryDeductionJobRepository.releaseStaleProcessingJobs();
      await recoverInventoryDeductionJobs();
    } catch (error) {
      logger.error("inventory.deduction_recovery_scan_failed", toError(error));
    } finally {
      running = false;
    }
  };

  void run();

  const timer = setInterval(() => void run(), 30_000);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
};
