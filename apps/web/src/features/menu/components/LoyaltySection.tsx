import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  Select,
  StaleDataBanner,
} from "@pos/ui";
import { createCustomersApi, createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { notifyError } from "@/shared/lib/notify";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import {
  validateLoyaltyCustomerDraft,
  validateLoyaltyTierDraft,
} from "@/features/menu/helpers/loyalty-form";
import type { CustomerLoyaltyTier, LoyaltyCustomer } from "@pos/types";

const menuApi = createMenuApi(apiClient);
const customersApi = createCustomersApi(apiClient);

export const LoyaltySection = () => {
  const qc = useQueryClient();
  const [tierName, setTierName] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [discountValue, setDiscountValue] = useState("5");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerTierId, setCustomerTierId] = useState("");

  const tiersQuery = useQuery<CustomerLoyaltyTier[]>({
    queryKey: ["loyalty", "tiers"],
    queryFn: () => menuApi.listLoyaltyTiers<CustomerLoyaltyTier>(),
  });
  const customersQuery = useQuery<LoyaltyCustomer[]>({
    queryKey: ["loyalty", "customers"],
    queryFn: customersApi.list,
  });

  const tierErrors = useLocalFormApiErrors();
  const customerErrors = useLocalFormApiErrors();
  const tierClientErrors = useMemo(
    () =>
      validateLoyaltyTierDraft({
        name: tierName,
        discountType,
        discountValue,
      }),
    [discountType, discountValue, tierName],
  );
  const customerClientErrors = useMemo(
    () =>
      validateLoyaltyCustomerDraft({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      }),
    [customerEmail, customerName, customerPhone],
  );

  const createTier = useMutation({
    mutationFn: () =>
      menuApi.createLoyaltyTier<CustomerLoyaltyTier>({
        name: tierName.trim(),
        ...(discountType === "PERCENT"
          ? { discountPercent: Number(discountValue) }
          : { discountFixed: Number(discountValue) }),
      }),
    onSuccess: () => {
      tierErrors.resetValidation();
      qc.invalidateQueries({ queryKey: ["loyalty"] });
      setTierName("");
    },
  });
  const createCustomer = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: customerName.trim(),
        ...(customerPhone.trim() ? { phone: customerPhone.trim() } : {}),
        ...(customerEmail.trim() ? { email: customerEmail.trim() } : {}),
        ...(customerTierId ? { loyaltyTierId: customerTierId } : {}),
      }),
    onSuccess: () => {
      customerErrors.resetValidation();
      qc.invalidateQueries({ queryKey: ["loyalty", "customers"] });
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerTierId("");
    },
  });
  const assign = useMutation({
    mutationFn: ({
      id,
      loyaltyTierId,
    }: {
      id: string;
      loyaltyTierId: string | null;
    }) => customersApi.assignTier(id, loyaltyTierId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["loyalty", "customers"] }),
    onError: (error) =>
      notifyError(error, "Failed to update customer loyalty tier"),
  });
  const removeTier = useMutation({
    mutationFn: (id: string) => menuApi.removeLoyaltyTier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loyalty"] }),
    onError: (error) => notifyError(error, "Failed to delete loyalty tier"),
  });

  const dependencyFailed =
    (tiersQuery.isError && !tiersQuery.data) ||
    (customersQuery.isError && !customersQuery.data);
  if (dependencyFailed) {
    return (
      <QueryErrorState
        title="Unable to load loyalty configuration"
        description="Loyalty tiers or customers could not be loaded. Retry before making loyalty changes so missing records are not treated as an empty configuration."
        onRetry={() =>
          void Promise.all([tiersQuery.refetch(), customersQuery.refetch()])
        }
        isRetrying={tiersQuery.isFetching || customersQuery.isFetching}
      />
    );
  }

  const tiers = tiersQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-text-primary">Loyalty pricing</h2>
        <p className="text-sm text-text-secondary">
          Stage 6 applies a customer tier after promotions. Non-stackable
          promotions explicitly compete with the loyalty discount and the larger
          discount wins.
        </p>
      </div>

      {(tiersQuery.isError || customersQuery.isError) && (
        <StaleDataBanner
          message="Loyalty data could not be refreshed. Showing the latest cached tiers and customers."
          onRetry={() =>
            void Promise.all([tiersQuery.refetch(), customersQuery.refetch()])
          }
          isRetrying={tiersQuery.isFetching || customersQuery.isFetching}
        />
      )}

      <div className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-4">
        <div className="md:col-span-4">
          <FormErrorSummary messages={tierErrors.formErrorMessages} />
        </div>
        <Input
          label="Tier name"
          required
          value={tierName}
          error={tierErrors.fieldError("name", tierClientErrors.name)}
          onBlur={() => tierErrors.touchField("name")}
          onChange={(event) => {
            tierErrors.clearFieldError("name");
            setTierName(event.target.value);
          }}
        />
        <Select
          label="Discount"
          required
          value={discountType}
          onChange={(event) => setDiscountType(event as "PERCENT" | "FIXED")}
          options={[
            { value: "PERCENT", label: "Percentage" },
            { value: "FIXED", label: "Fixed amount" },
          ]}
        />
        <Input
          label={discountType === "PERCENT" ? "Percent" : "Amount"}
          required
          type="number"
          min={0}
          max={discountType === "PERCENT" ? 100 : undefined}
          step="0.01"
          value={discountValue}
          error={
            tierErrors.fieldErrors.discountPercent ??
            tierErrors.fieldErrors.discountFixed ??
            tierErrors.fieldError(
              "discountValue",
              tierClientErrors.discountValue,
            )
          }
          onBlur={() => tierErrors.touchField("discountValue")}
          onChange={(event) => {
            tierErrors.clearFieldError("discountPercent");
            tierErrors.clearFieldError("discountFixed");
            setDiscountValue(event.target.value);
          }}
        />
        <div className="flex items-end">
          <Button
            disabled={
              createTier.isPending || Object.keys(tierClientErrors).length > 0
            }
            loading={createTier.isPending}
            onClick={() => {
              tierErrors.markSubmitted();
              tierErrors.clearErrors();
              if (Object.keys(tierClientErrors).length) return;
              createTier.mutate(undefined, {
                onError: (error) =>
                  tierErrors.handleApiError(
                    error,
                    ["name", "discountPercent", "discountFixed"],
                    "Failed to create loyalty tier",
                  ),
              });
            }}
          >
            Add tier
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="flex items-center justify-between rounded-lg border border-border p-3"
          >
            <div>
              <p className="font-medium text-text-primary">{tier.name}</p>
              <p className="text-xs text-text-secondary">
                {tier.discountPercent !== null
                  ? `${tier.discountPercent}% off`
                  : `${tier.discountFixed} off`}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              loading={removeTier.isPending && removeTier.variables === tier.id}
              disabled={removeTier.isPending}
              onClick={() => removeTier.mutate(tier.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 font-medium text-text-primary">Customers</h3>
        <div className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-4">
          <div className="md:col-span-4">
            <FormErrorSummary messages={customerErrors.formErrorMessages} />
          </div>
          <Input
            label="Name"
            required
            value={customerName}
            error={customerErrors.fieldError("name", customerClientErrors.name)}
            onBlur={() => customerErrors.touchField("name")}
            onChange={(event) => {
              customerErrors.clearFieldError("name");
              setCustomerName(event.target.value);
            }}
          />
          <Input
            label="Phone"
            value={customerPhone}
            error={customerErrors.fieldError(
              "phone",
              customerClientErrors.phone,
            )}
            onBlur={() => customerErrors.touchField("phone")}
            onChange={(event) => {
              customerErrors.clearFieldError("phone");
              setCustomerPhone(event.target.value);
            }}
          />
          <Input
            label="Email"
            type="email"
            value={customerEmail}
            error={customerErrors.fieldError(
              "email",
              customerClientErrors.email,
            )}
            onBlur={() => customerErrors.touchField("email")}
            onChange={(event) => {
              customerErrors.clearFieldError("email");
              setCustomerEmail(event.target.value);
            }}
          />
          <Select
            label="Loyalty tier"
            value={customerTierId}
            error={customerErrors.fieldErrors.loyaltyTierId}
            onChange={(event) => {
              customerErrors.clearFieldError("loyaltyTierId");
              setCustomerTierId(event);
            }}
            options={[
              { value: "", label: "No tier" },
              ...tiers.map((tier) => ({ value: tier.id, label: tier.name })),
            ]}
          />
          <Button
            disabled={
              createCustomer.isPending ||
              Object.keys(customerClientErrors).length > 0
            }
            loading={createCustomer.isPending}
            onClick={() => {
              customerErrors.markSubmitted();
              customerErrors.clearErrors();
              if (Object.keys(customerClientErrors).length) return;
              createCustomer.mutate(undefined, {
                onError: (error) =>
                  customerErrors.handleApiError(
                    error,
                    ["name", "phone", "email", "loyaltyTierId"],
                    "Failed to create customer",
                  ),
              });
            }}
          >
            Add customer
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="grid items-center gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_240px]"
          >
            <div>
              <p className="font-medium text-text-primary">{customer.name}</p>
              <p className="text-xs text-text-secondary">
                {customer.phone || customer.email || "No contact"}
              </p>
            </div>
            <Select
              aria-label={`Loyalty tier for ${customer.name}`}
              value={customer.loyaltyTierId ?? ""}
              disabled={assign.isPending}
              onChange={(event) =>
                assign.mutate({
                  id: customer.id,
                  loyaltyTierId: event || null,
                })
              }
              options={[
                { value: "", label: "No tier" },
                ...tiers.map((tier) => ({ value: tier.id, label: tier.name })),
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
