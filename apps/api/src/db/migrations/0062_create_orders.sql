

CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "table_id" uuid,
  "customer_id" uuid,
  "customer_group_id" uuid,
  "merged_into_order_id" uuid,
  "created_by" uuid,
  "source" "order_source" DEFAULT 'STAFF' NOT NULL,
  "customer_session_id" uuid,
  "status" "order_status" DEFAULT 'OPEN' NOT NULL,
  "type" "order_type" NOT NULL,
  "billing_mode" "billing_mode" DEFAULT 'LINE_ITEMS' NOT NULL,
  "cover_count" integer,
  "per_cover_price_rule_id" uuid,
  "per_cover_rate" numeric(10, 2),
  "subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
  "tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
  "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
  "service_charge_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
  "rounding_adjustment" numeric(10, 2) DEFAULT '0' NOT NULL,
  "total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
  "notes" text,
  "resolution_as_of" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "orders_per_cover_fields_valid" CHECK (("billing_mode" = 'LINE_ITEMS' AND "cover_count" IS NULL AND "per_cover_rate" IS NULL) OR ("billing_mode" = 'PER_COVER' AND "cover_count" > 0 AND "per_cover_price_rule_id" IS NOT NULL AND "per_cover_rate" IS NOT NULL)),
  CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE,
  CONSTRAINT "orders_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id"),
  CONSTRAINT "orders_customer_group_id_customer_groups_id_fk" FOREIGN KEY ("customer_group_id") REFERENCES "customer_groups"("id") ON DELETE SET NULL,
  CONSTRAINT "orders_merged_into_order_id_orders_id_fk" FOREIGN KEY ("merged_into_order_id") REFERENCES "orders"("id") ON DELETE SET NULL,
  CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "orders_customer_session_id_customer_sessions_id_fk" FOREIGN KEY ("customer_session_id") REFERENCES "customer_sessions"("id"),
  CONSTRAINT "orders_per_cover_price_rule_id_price_rules_id_fk" FOREIGN KEY ("per_cover_price_rule_id") REFERENCES "price_rules"("id") ON DELETE SET NULL,
  CONSTRAINT "orders_branch_tenant_fk" FOREIGN KEY ("branch_id", "tenant_id") REFERENCES "branches"("id", "tenant_id") ON DELETE CASCADE
);

CREATE INDEX "orders_tenant_branch_idx" ON "orders" USING btree ("tenant_id", "branch_id");

CREATE INDEX "orders_tenant_branch_created_at_idx" ON "orders" USING btree ("tenant_id", "branch_id", "created_at");

CREATE INDEX "orders_tenant_branch_status_created_at_idx" ON "orders" USING btree ("tenant_id", "branch_id", "status", "created_at");

CREATE INDEX "orders_tenant_created_at_idx" ON "orders" USING btree ("tenant_id", "created_at");

CREATE INDEX "orders_tenant_short_id_idx" ON "orders" USING btree ("tenant_id", (right("id"::text, 8)));

CREATE INDEX "orders_tenant_branch_short_id_idx" ON "orders" USING btree ("tenant_id", "branch_id", (right("id"::text, 8)));

CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");

CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");

CREATE INDEX "orders_merged_into_idx" ON "orders" USING btree ("merged_into_order_id");

CREATE INDEX "orders_customer_session_idx" ON "orders" USING btree ("customer_session_id");

CREATE UNIQUE INDEX "orders_customer_session_active_unique" ON "orders" USING btree ("customer_session_id") WHERE "customer_session_id" IS NOT NULL AND "status" NOT IN ('PAID', 'CLOSED', 'CANCELLED');

CREATE INDEX "orders_customer_group_idx" ON "orders" USING btree ("customer_group_id");

CREATE INDEX "orders_billing_mode_idx" ON "orders" USING btree ("tenant_id", "billing_mode");

CREATE INDEX "orders_resolution_as_of_idx" ON "orders" USING btree ("resolution_as_of");

