-- Index foreign-key lookups used by order history and scoped demo cleanup.
CREATE INDEX "bills_order_idx" ON "bills" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "payments_bill_idx" ON "payments" USING btree ("bill_id");
--> statement-breakpoint
CREATE INDEX "payment_refunds_payment_idx" ON "payment_refunds" USING btree ("payment_id");
--> statement-breakpoint
CREATE INDEX "bill_order_items_order_item_idx" ON "bill_order_items" USING btree ("order_item_id");
--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "order_items_ticket_idx" ON "order_items" USING btree ("kitchen_ticket_id");
--> statement-breakpoint
CREATE INDEX "order_items_menu_item_idx" ON "order_items" USING btree ("menu_item_id");
--> statement-breakpoint
CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");
--> statement-breakpoint
CREATE INDEX "order_item_modifiers_item_idx" ON "order_item_modifiers" USING btree ("order_item_id");
--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX "order_inventory_deductions_order_item_idx" ON "order_inventory_deductions" USING btree ("order_item_id");
--> statement-breakpoint
CREATE INDEX "promotion_redemptions_order_idx" ON "promotion_redemptions" USING btree ("order_id");
