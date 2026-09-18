import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { inventoryDeductionJobs } from "@/db/schema";
import type { InventoryOrderItemInput } from "./inventory.types";

export type InventoryDeductionJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "FAILED"
  | "COMPLETED";

const enqueue = async (input: {
  tenantId: string;
  branchId: string;
  orderId: string;
  kitchenTicketId: string;
  items: InventoryOrderItemInput[];
  performedBy: string | null;
}) => {
  const [inserted] = await db
    .insert(inventoryDeductionJobs)
    .values({
      ...input,
      status: "PENDING",
      nextAttemptAt: new Date(),
    })
    .onConflictDoNothing({
      target: [
        inventoryDeductionJobs.orderId,
        inventoryDeductionJobs.kitchenTicketId,
      ],
    })
    .returning();

  if (inserted) return inserted;
  return db.query.inventoryDeductionJobs.findFirst({
    where: and(
      eq(inventoryDeductionJobs.orderId, input.orderId),
      eq(inventoryDeductionJobs.kitchenTicketId, input.kitchenTicketId),
    ),
  });
};

const findById = (id: string) =>
  db.query.inventoryDeductionJobs.findFirst({
    where: eq(inventoryDeductionJobs.id, id),
  });

const findRecoverable = (limit = 100) =>
  db.query.inventoryDeductionJobs.findMany({
    where: and(
      inArray(inventoryDeductionJobs.status, ["PENDING", "FAILED"]),
      lte(inventoryDeductionJobs.nextAttemptAt, new Date()),
    ),
    limit,
  });

const markProcessing = async (id: string) => {
  const [updated] = await db
    .update(inventoryDeductionJobs)
    .set({ status: "PROCESSING", updatedAt: new Date() })
    .where(
      and(
        eq(inventoryDeductionJobs.id, id),
        inArray(inventoryDeductionJobs.status, ["PENDING", "FAILED"]),
      ),
    )
    .returning();
  return updated;
};

const markCompleted = (id: string) =>
  db
    .update(inventoryDeductionJobs)
    .set({
      status: "COMPLETED",
      completedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(inventoryDeductionJobs.id, id));

const markFailed = (id: string, attemptCount: number, lastError: string) => {
  const backoffSeconds = Math.min(
    300,
    Math.max(5, 2 ** Math.min(attemptCount, 8)),
  );
  return db
    .update(inventoryDeductionJobs)
    .set({
      status: "FAILED",
      attemptCount,
      lastError: lastError.slice(0, 2000),
      nextAttemptAt: new Date(Date.now() + backoffSeconds * 1000),
      updatedAt: new Date(),
    })
    .where(eq(inventoryDeductionJobs.id, id));
};

const releaseStaleProcessingJobs = () =>
  db
    .update(inventoryDeductionJobs)
    .set({ status: "FAILED", nextAttemptAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(inventoryDeductionJobs.status, "PROCESSING"),
        lte(
          inventoryDeductionJobs.updatedAt,
          new Date(Date.now() - 5 * 60 * 1000),
        ),
      ),
    );

export const inventoryDeductionJobRepository = {
  enqueue,
  findById,
  findRecoverable,
  markProcessing,
  markCompleted,
  markFailed,
  releaseStaleProcessingJobs,
};
