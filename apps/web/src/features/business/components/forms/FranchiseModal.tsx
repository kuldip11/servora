import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal } from "@pos/ui";
import type { OrganizationSummary, Tenant } from "@pos/types";
import {
  franchiseBusinessFormSchema,
  type FranchiseBusinessFormValues,
} from "@pos/validation";
import { businessService } from "@/features/business/services/business.service";
import { authService } from "@/features/auth/services/auth.service";
import { activateMembershipContext } from "@/shared/auth/active-context";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { usePermissions } from "@/shared/auth/permissions";
import { CapabilityGrid } from "./CapabilityGrid";
import { franchiseDefaults, inputClass } from "./business-form-defaults";

export const FranchiseModal = ({
  open,
  franchise,
  organizations,
  organizationId,
  onOrganizationChange,
  onClose,
  onSaved,
}: {
  open: boolean;
  franchise: Tenant | null;
  organizations: OrganizationSummary[];
  organizationId: string;
  onOrganizationChange: (id: string) => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const { has } = usePermissions();
  const form = useForm<FranchiseBusinessFormValues>({
    resolver: zodResolver(franchiseBusinessFormSchema),
    defaultValues: franchiseDefaults,
  });
  useEffect(() => {
    if (open)
      form.reset(
        franchise
          ? ({
              ...franchiseDefaults,
              ...franchise,
              cuisineTypes: franchise.cuisineTypes ?? [],
            } as FranchiseBusinessFormValues)
          : franchiseDefaults,
      );
  }, [open, franchise]);
  const mutation = useMutation({
    mutationFn: async (values: FranchiseBusinessFormValues) => {
      if (franchise)
        return businessService.updateFranchise(franchise.id, values);
      const created = await businessService.createFranchise(
        organizationId,
        values,
      );
      const memberships = await authService.memberships();
      const membership = memberships.find(
        (item) => item.membershipId === created.membershipId,
      );
      if (membership)
        await activateMembershipContext(
          membership,
          memberships,
          organizationId,
        );
      return created.tenant;
    },
    onSuccess: async () => {
      notifySuccess(franchise ? "Franchise updated" : "Franchise created");
      await onSaved();
      onClose();
    },
    onError: (error) => notifyError(error, "Could not save franchise"),
  });
  const archiveMutation = useMutation({
    mutationFn: () => businessService.archiveFranchise(franchise!.id),
    onSuccess: async () => {
      notifySuccess("Franchise archived");
      await onSaved();
      onClose();
    },
    onError: (error) => notifyError(error, "Could not archive franchise"),
  });
  const values = form.watch();
  const e = form.formState.errors;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={franchise ? "Edit Franchise" : "Create Franchise"}
      size="xl"
    >
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        {!franchise && (
          <label className="block text-sm font-medium">
            Organization
            <select
              className={`mt-1 ${inputClass}`}
              value={organizationId}
              onChange={(event) => onOrganizationChange(event.target.value)}
            >
              {organizations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Franchise / Brand name"
            placeholder="e.g. KKS Kitchen"
            error={e.name?.message}
            {...form.register("name")}
          />
          <Input
            label="Display name (optional)"
            placeholder="Name shown to customers"
            {...form.register("displayName")}
          />
          <Input
            label="Cuisine types"
            placeholder="e.g. Indian, Continental, Cafe"
            error={e.cuisineTypes?.message}
            value={values.cuisineTypes.join(", ")}
            onChange={(event) =>
              form.setValue(
                "cuisineTypes",
                event.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
                { shouldValidate: true },
              )
            }
          />
          <label className="text-sm font-medium">
            Business model
            <select
              className={`mt-1 ${inputClass}`}
              {...form.register("businessModel")}
            >
              {[
                "RESTAURANT",
                "CAFE",
                "CLOUD_KITCHEN",
                "QSR",
                "FINE_DINING",
                "FOOD_COURT",
                "BAKERY",
                "BAR_PUB",
                "OTHER",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <Input
            label="Default currency"
            placeholder="e.g. INR"
            error={e.defaultCurrency?.message}
            {...form.register("defaultCurrency")}
          />
          <Input
            label="Default timezone"
            placeholder="e.g. Asia/Kolkata"
            error={e.defaultTimezone?.message}
            {...form.register("defaultTimezone")}
          />
          <label className="text-sm font-medium">
            Default tax mode
            <select
              className={`mt-1 ${inputClass}`}
              {...form.register("defaultTaxMode")}
            >
              <option value="EXCLUSIVE">Exclusive</option>
              <option value="INCLUSIVE">Inclusive</option>
            </select>
          </label>
          <Input
            label="Default tax rate (optional)"
            type="number"
            step="0.01"
            placeholder="e.g. 5"
            {...form.register("defaultTaxRate", { valueAsNumber: true })}
          />
          <Input
            label="Service charge % (optional)"
            type="number"
            step="0.01"
            placeholder="e.g. 10"
            {...form.register("serviceChargePercent", { valueAsNumber: true })}
          />
          <label className="text-sm font-medium">
            Rounding policy
            <select
              className={`mt-1 ${inputClass}`}
              {...form.register("roundingPolicy")}
            >
              <option value="NONE">None</option>
              <option value="NEAREST_1">Nearest 1</option>
              <option value="NEAREST_5">Nearest 5</option>
              <option value="NEAREST_10">Nearest 10</option>
            </select>
          </label>
          <Input
            label="Support email (optional)"
            placeholder="e.g. support@kkskitchen.com"
            {...form.register("supportEmail")}
          />
          <Input
            label="Support phone (optional)"
            placeholder="e.g. +91 98765 43210"
            {...form.register("supportPhone")}
          />
          <Input
            label="Website (optional)"
            placeholder="e.g. https://kkskitchen.com"
            {...form.register("website")}
          />
          <Input
            label="Logo URL (optional)"
            placeholder="https://example.com/logo.png"
            {...form.register("logoUrl")}
          />
          <Input
            label="Brand image URL (optional)"
            placeholder="https://example.com/brand-cover.jpg"
            {...form.register("primaryBrandImageUrl")}
          />
        </div>
        <label className="block text-sm font-medium">
          Description
          <textarea
            className={`mt-1 ${inputClass}`}
            rows={3}
            placeholder="Briefly describe the brand and its customer experience"
            {...form.register("description")}
          />
        </label>
        <CapabilityGrid
          values={{
            dineInEnabled: values.dineInEnabled,
            takeawayEnabled: values.takeawayEnabled,
            deliveryEnabled: values.deliveryEnabled,
            customerQrEnabled: values.customerQrEnabled,
            tableManagementEnabled: values.tableManagementEnabled,
            kdsEnabled: values.kdsEnabled,
            waiterServiceEnabled: values.waiterServiceEnabled,
            serviceChargeTaxable: values.serviceChargeTaxable ?? false,
            courseSequencingEnabled: values.courseSequencingEnabled ?? false,
          }}
          setValue={(key, value) =>
            form.setValue(
              key as keyof FranchiseBusinessFormValues,
              value as never,
              { shouldValidate: true },
            )
          }
        />
        <div className="flex justify-between gap-2">
          {franchise && has("tenant:archive") ? (
            <Button
              type="button"
              variant="danger"
              loading={archiveMutation.isPending}
              onClick={() =>
                window.confirm("Archive this franchise?") &&
                archiveMutation.mutate()
              }
            >
              Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={!organizationId}
            >
              Save Franchise
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
