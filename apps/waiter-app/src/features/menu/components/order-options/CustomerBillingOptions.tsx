import { useState } from "react";
import { ChevronDown, SlidersHorizontal, UserRound, X } from "lucide-react";
import { SelectMenu } from "@pos/ui";
import type { LoyaltyCustomer } from "@pos/types";

interface Props {
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

export const CustomerBillingOptions = ({
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
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border px-3 text-left text-sm font-medium text-text-secondary"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Customer and billing
        {customerName && (
          <span className="ml-1 truncate text-xs text-primary">
            · {customerName}
          </span>
        )}
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-3 rounded-2xl bg-surface-secondary p-3">
          {customerId ? (
            <div className="flex min-h-11 items-center justify-between rounded-xl border border-primary-border bg-primary-surface px-3">
              <span className="flex items-center gap-2 text-sm font-medium text-primary">
                <UserRound className="h-4 w-4" /> {customerName}
              </span>
              <button
                type="button"
                onClick={onClearCustomer}
                aria-label="Remove customer"
              >
                <X className="h-4 w-4 text-primary" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Search customer by name or phone…"
                value={customerSearch}
                onChange={(event) => onCustomerSearchChange(event.target.value)}
                aria-label="Search customer by name or phone"
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {customerResults && customerResults.length > 0 && (
                <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-36 overflow-y-auto rounded-xl border border-border bg-surface shadow-md">
                  {customerResults.map((customer) => (
                    <button
                      type="button"
                      key={customer.id}
                      onClick={() =>
                        onSelectCustomer(customer.id, customer.name)
                      }
                      className="w-full border-b border-divider px-4 py-2.5 text-left last:border-0"
                    >
                      <p className="text-sm font-medium text-text-primary">
                        {customer.name}
                      </p>
                      <p className="text-xs text-text-disabled">
                        {customer.phone || customer.email || "No contact"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectMenu
              label="Customer group"
              placeholder="No customer group"
              value={customerGroupId || undefined}
              onChange={onCustomerGroupChange}
              className="min-h-11 rounded-xl"
              options={[
                { value: "", label: "No customer group" },
                ...customerGroups.map((group) => ({
                  value: group.id,
                  label: group.name,
                })),
              ]}
            />
            <SelectMenu
              label="Billing mode"
              value={billingMode}
              onChange={(value) =>
                onBillingModeChange(value as "LINE_ITEMS" | "PER_COVER")
              }
              className="min-h-11 rounded-xl"
              options={[
                {
                  value: "LINE_ITEMS",
                  label: "Line items",
                  description: "Charge for ordered items",
                },
                {
                  value: "PER_COVER",
                  label: "Per cover",
                  description: "Charge by guest count",
                  disabled: !perCoverRules.length,
                },
              ]}
            />
          </div>

          {billingMode === "PER_COVER" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-text-secondary">
                Covers
                <input
                  type="number"
                  min={1}
                  value={coverCount}
                  onChange={(event) =>
                    onCoverCountChange(
                      Math.max(1, Number(event.target.value) || 1),
                    )
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                />
              </label>
              <SelectMenu
                label="Rate"
                placeholder="Select a rate…"
                value={perCoverPriceRuleId || undefined}
                onChange={onPerCoverPriceRuleChange}
                className="min-h-11 rounded-xl"
                options={perCoverRules.map((rule) => ({
                  value: rule.id,
                  label: rule.coverTier ?? "Any cover",
                  description: `₹${Number(rule.price ?? 0).toFixed(2)}`,
                }))}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
