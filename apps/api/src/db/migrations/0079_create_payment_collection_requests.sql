CREATE TABLE "payment_collection_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE cascade,
  "request_key" uuid NOT NULL,
  "request_fingerprint" varchar(64) NOT NULL,
  "payment_id" uuid NOT NULL REFERENCES "payments"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_collection_requests_order_key_unique" ON "payment_collection_requests" USING btree ("order_id", "request_key");
