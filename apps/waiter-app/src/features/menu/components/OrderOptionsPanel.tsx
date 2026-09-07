import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Modal } from "@pos/ui";
import { ALL_ORDER_TYPES } from "@/features/menu/constants";
import { CustomerBillingOptions } from "@/features/menu/components/order-options/CustomerBillingOptions";
import { OrderTableSelector } from "@/features/menu/components/order-options/OrderTableSelector";
import type { LoyaltyCustomer } from "@pos/types";
import type { RestaurantTableDto } from "@pos/api-client";

interface Props {
  availableOrderTypes: typeof ALL_ORDER_TYPES;
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  onOrderTypeChange: (type: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => void;
  tablesEnabled: boolean;
  tables: RestaurantTableDto[] | undefined;
  tableId: string;
  onTableChange: (id: string) => void;
  customerId: string;
  customerName: string;
  onClearCustomer: () => void;
  customerSearch: string;
  onCustomerSearchChange: (value: string) => void;
  customerResults: LoyaltyCustomer[] | undefined;
  onSelectCustomer: (id: string, name: string) => void;
  customerGroups: Array<{ id: string; name: string }>;
  customerGroupId: string;
  onCustomerGroupChange: (id: string) => void;
  billingMode: "LINE_ITEMS" | "PER_COVER";
  onBillingModeChange: (mode: "LINE_ITEMS" | "PER_COVER") => void;
  coverCount: number;
  onCoverCountChange: (count: number) => void;
  perCoverRules: Array<{
    id: string;
    coverTier?: "ADULT" | "CHILD" | null;
    price: string | number | null;
  }>;
  perCoverPriceRuleId: string;
  onPerCoverPriceRuleChange: (id: string) => void;
}

export const buildTableOptions = (tables: RestaurantTableDto[]) =>
  [...tables]
    .filter((table) => table.isActive !== false)
    .sort((left, right) =>
      left.status === right.status
        ? left.name.localeCompare(right.name)
        : left.status === "AVAILABLE"
          ? -1
          : 1,
    )
    .map((table) => ({
      value: table.id,
      label: table.name,
      description:
        table.status === "AVAILABLE"
          ? `${table.capacity} seats`
          : (table.status ?? "Unavailable").charAt(0) +
            (table.status ?? "Unavailable").slice(1).toLowerCase(),
      group: table.status === "AVAILABLE" ? "Available" : "Unavailable",
      disabled: table.status !== "AVAILABLE",
    }));

export const OrderOptionsPanel = ({
  availableOrderTypes,
  orderType,
  onOrderTypeChange,
  tablesEnabled,
  tables,
  tableId,
  onTableChange,
  customerId,
  customerName,
  onClearCustomer,
  customerSearch,
  onCustomerSearchChange,
  customerResults,
  onSelectCustomer,
  customerGroups,
  customerGroupId,
  onCustomerGroupChange,
  billingMode,
  onBillingModeChange,
  coverCount,
  onCoverCountChange,
  perCoverRules,
  perCoverPriceRuleId,
  onPerCoverPriceRuleChange,
}: Props) => {
  const needsTable = orderType === "DINE_IN" && tablesEnabled;
  const selectedTable = tables?.find((table) => table.id === tableId);
  const contextReady =
    !needsTable ||
    Boolean(selectedTable && selectedTable.status === "AVAILABLE");
  const [editingContext, setEditingContext] = useState(!contextReady);
  const orderTypeLabel =
    availableOrderTypes.find((type) => type.value === orderType)?.label ??
    orderType.replace("_", " ");

  useEffect(() => {
    if (!contextReady) setEditingContext(true);
  }, [contextReady]);

  const contextTitle = selectedTable?.name ?? orderTypeLabel;
  const contextDescription = [
    orderTypeLabel,
    selectedTable?.capacity ? `${selectedTable.capacity} seats` : null,
    customerName || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="shrink-0 bg-background px-3.5 pt-2.5 md:px-4 md:pt-3">
        <button
          type="button"
          onClick={() => setEditingContext(true)}
          className={`flex min-h-[54px] w-full items-center gap-3 rounded-2xl border px-3 text-left transition-colors ${
            contextReady
              ? "border-primary-border bg-primary-surface"
              : "border-warning/30 bg-warning-surface"
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              contextReady
                ? "bg-surface text-primary"
                : "bg-surface text-warning"
            }`}
          >
            <MapPin className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-text-primary">
              {contextReady ? contextTitle : "Set order details"}
            </strong>
            <span className="block truncate text-xs text-text-secondary">
              {contextReady
                ? contextDescription
                : `${orderTypeLabel} · table required`}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">
            {contextReady ? "Edit" : "Set up"}
          </span>
        </button>
      </div>

      <Modal
        open={editingContext}
        onClose={() => setEditingContext(false)}
        title="Order details"
        description="Choose the service type, table, customer, and billing settings for this order."
        size="lg"
        preventDismiss={!contextReady}
        footer={
          <button
            type="button"
            disabled={!contextReady}
            onClick={() => setEditingContext(false)}
            className="min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            Show menu
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Service type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {availableOrderTypes.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => {
                    onOrderTypeChange(value);
                    if (value !== "DINE_IN") onTableChange("");
                  }}
                  className={`min-h-12 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                    orderType === value
                      ? "border-primary bg-primary-surface text-primary"
                      : "border-border bg-surface text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!availableOrderTypes.length && (
            <p className="text-xs text-danger">
              No order types are enabled for this branch. Ask a manager to
              update the branch settings.
            </p>
          )}

          {needsTable && tables && tables.length > 0 && (
            <OrderTableSelector
              tables={tables}
              tableId={tableId}
              onTableChange={onTableChange}
            />
          )}

          {needsTable && tables && tables.length === 0 && (
            <p className="rounded-xl bg-danger-surface p-3 text-xs text-danger">
              No tables are configured for this branch. Choose another service
              type or ask a manager to add tables.
            </p>
          )}

          <CustomerBillingOptions
            customerId={customerId}
            customerName={customerName}
            onClearCustomer={onClearCustomer}
            customerSearch={customerSearch}
            onCustomerSearchChange={onCustomerSearchChange}
            customerResults={customerResults}
            onSelectCustomer={onSelectCustomer}
            customerGroups={customerGroups}
            customerGroupId={customerGroupId}
            onCustomerGroupChange={onCustomerGroupChange}
            billingMode={billingMode}
            onBillingModeChange={onBillingModeChange}
            coverCount={coverCount}
            onCoverCountChange={onCoverCountChange}
            perCoverRules={perCoverRules}
            perCoverPriceRuleId={perCoverPriceRuleId}
            onPerCoverPriceRuleChange={onPerCoverPriceRuleChange}
          />
        </div>
      </Modal>
    </>
  );
};
