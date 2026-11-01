CREATE TABLE "inventory_deduction_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "kitchen_ticket_id" uuid NOT NULL,
  "items" jsonb NOT NULL,
  "performed_by" uuid,
  "status" varchar(20) DEFAULT 'PENDING' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp DEFAULT now() NOT NULL,
  "last_error" text,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "inventory_deduction_jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_deduction_jobs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_deduction_jobs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_deduction_jobs_kitchen_ticket_id_kitchen_tickets_id_fk" FOREIGN KEY ("kitchen_ticket_id") REFERENCES "kitchen_tickets"("id") ON DELETE CASCADE,
  CONSTRAINT "inventory_deduction_jobs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "inventory_deduction_jobs_retry_idx" ON "inventory_deduction_jobs" USING btree ("status", "next_attempt_at");
CREATE UNIQUE INDEX "inventory_deduction_jobs_order_ticket_unique" ON "inventory_deduction_jobs" USING btree ("order_id", "kitchen_ticket_id");
