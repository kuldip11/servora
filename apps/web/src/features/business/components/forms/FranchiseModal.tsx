import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FieldErrorText,
  FormErrorSummary,
  Input,
  Modal,
  Select,
} from "@pos/ui";
import type { OrganizationSummary, Tenant } from "@pos/types";
import {
  franchiseBusinessFormSchema,
  type FranchiseBusinessFormValues,
} from "@pos/validation";
import {
  useArchiveFranchise,
  useSaveFranchise,
} from "@/features/business/hooks/useBusiness";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import { usePermissions } from "@/shared/auth/permissions";
import { CapabilityGrid } from "./CapabilityGrid";
import {
  franchiseDefaults,
  franchiseFieldPaths,
  inputClass,
} from "./business-form-defaults";

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
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<FranchiseBusinessFormValues>();
  useEffect(() => {
    if (open) {
      clearFormErrors();
      form.reset(
        franchise
          ? ({
              ...franchiseDefaults,
              ...franchise,
              cuisineTypes: franchise.cuisineTypes ?? [],
            } as FranchiseBusinessFormValues)
          : franchiseDefaults,
      );
    }
  }, [clearFormErrors, form, franchise, open]);
  const mutation = useSaveFranchise({
    franchiseId: franchise?.id,
    organizationId,
  });
  const archiveMutation = useArchiveFranchise(franchise?.id ?? "");
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
        onSubmit={form.handleSubmit((values) => {
          clearFormErrors();
          mutation.mutate(values, {
            onSuccess: async () => {
              notifySuccess(
                franchise ? "Franchise updated" : "Franchise created",
              );
              await onSaved();
              onClose();
            },
            onError: (error) =>
              handleApiError(
                error,
                form.setError,
                franchiseFieldPaths,
                "Could not save franchise",
              ),
          });
        })}
      >
        {!franchise && (
          <Select
            label="Organization"
            value={organizationId}
            onChange={onOrganizationChange}
            options={organizations.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Franchise / Brand name"
            required
            placeholder="e.g. KKS Kitchen"
            error={e.name?.message}
            {...form.register("name")}
          />
          <Input
            label="Display name (optional)"
            error={e.displayName?.message}
            placeholder="Name shown to customers"
            {...form.register("displayName")}
          />
          <Input
            label="Cuisine types"
            required
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
          <Select
            label="Business model"
            required
            value={values.businessModel}
            onChange={(value) =>
              form.setValue(
                "businessModel",
                value as FranchiseBusinessFormValues["businessModel"],
                { shouldDirty: true, shouldTouch: true, shouldValidate: true },
              )
            }
            error={e.businessModel?.message}
            options={[
              "RESTAURANT",
              "CAFE",
              "CLOUD_KITCHEN",
              "QSR",
              "FINE_DINING",
              "FOOD_COURT",
              "BAKERY",
              "BAR_PUB",
              "OTHER",
            ].map((value) => ({ value, label: value }))}
          />
          <Input
            label="Default currency"
            required
            placeholder="e.g. INR"
            error={e.defaultCurrency?.message}
            {...form.register("defaultCurrency")}
          />
          <Input
            label="Default timezone"
            required
            placeholder="e.g. Asia/Kolkata"
            error={e.defaultTimezone?.message}
            {...form.register("defaultTimezone")}
          />
          <Select
            label="Default tax mode"
            required
            value={values.defaultTaxMode}
            onChange={(value) =>
              form.setValue(
                "defaultTaxMode",
                value as FranchiseBusinessFormValues["defaultTaxMode"],
                { shouldDirty: true, shouldTouch: true, shouldValidate: true },
              )
            }
            error={e.defaultTaxMode?.message}
            options={[
              { value: "EXCLUSIVE", label: "Exclusive" },
              { value: "INCLUSIVE", label: "Inclusive" },
            ]}
          />
          <Input
            label="Default tax rate (optional)"
            error={e.defaultTaxRate?.message}
            type="number"
            step="0.01"
            placeholder="e.g. 5"
            {...form.register("defaultTaxRate", { valueAsNumber: true })}
          />
          <Input
            label="Service charge % (optional)"
            error={e.serviceChargePercent?.message}
            type="number"
            step="0.01"
            placeholder="e.g. 10"
            {...form.register("serviceChargePercent", { valueAsNumber: true })}
          />
          <Select
            label="Rounding policy"
            value={values.roundingPolicy}
            onChange={(value) =>
              form.setValue(
                "roundingPolicy",
                value as FranchiseBusinessFormValues["roundingPolicy"],
                { shouldDirty: true, shouldTouch: true, shouldValidate: true },
              )
            }
            error={e.roundingPolicy?.message}
            options={[
              { value: "NONE", label: "None" },
              { value: "NEAREST_1", label: "Nearest 1" },
              { value: "NEAREST_5", label: "Nearest 5" },
              { value: "NEAREST_10", label: "Nearest 10" },
            ]}
          />
          <Input
            label="Support email (optional)"
            error={e.supportEmail?.message}
            placeholder="e.g. support@kkskitchen.com"
            {...form.register("supportEmail")}
          />
          <Input
            label="Support phone (optional)"
            error={e.supportPhone?.message}
            placeholder="e.g. +91 98765 43210"
            {...form.register("supportPhone")}
          />
          <Input
            label="Website (optional)"
            error={e.website?.message}
            placeholder="e.g. https://kkskitchen.com"
            {...form.register("website")}
          />
          <Input
            label="Logo URL (optional)"
            error={e.logoUrl?.message}
            placeholder="https://example.com/logo.png"
            {...form.register("logoUrl")}
          />
          <Input
            label="Brand image URL (optional)"
            error={e.primaryBrandImageUrl?.message}
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
          <FieldErrorText message={e.description?.message} />
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
        <FormErrorSummary messages={formErrorMessages} />
        <div className="flex justify-between gap-2">
          {franchise && has("tenant:archive") ? (
            <Button
              type="button"
              variant="danger"
              loading={archiveMutation.isPending}
              onClick={() =>
                window.confirm("Archive this franchise?") &&
                archiveMutation.mutate(undefined, {
                  onSuccess: async () => {
                    notifySuccess("Franchise archived");
                    await onSaved();
                    onClose();
                  },
                  onError: (error) =>
                    notifyError(error, "Could not archive franchise"),
                })
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
              disabled={
                !organizationId ||
                !form.formState.isValid ||
                mutation.isPending ||
                (Boolean(franchise) && !form.formState.isDirty)
              }
            >
              {mutation.isPending ? "Saving…" : "Save Franchise"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
