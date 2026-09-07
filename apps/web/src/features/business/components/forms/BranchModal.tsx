import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal } from "@pos/ui";
import type { Branch } from "@pos/types";
import {
  businessBranchFormSchema,
  type BusinessBranchFormValues,
} from "@pos/validation";
import { businessService } from "@/features/business/services/business.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { usePermissions } from "@/shared/auth/permissions";
import { CapabilityGrid } from "./CapabilityGrid";
import { branchDefaults, inputClass } from "./business-form-defaults";

export const BranchModal = ({
  open,
  branch,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  branch: Branch | null;
  currency: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const { has } = usePermissions();
  const form = useForm<BusinessBranchFormValues>({
    resolver: zodResolver(businessBranchFormSchema),
    defaultValues: branchDefaults,
  });
  useEffect(() => {
    if (open)
      form.reset(
        branch
          ? ({
              ...branchDefaults,
              ...branch,
              status: branch.isActive ? "ACTIVE" : "INACTIVE",
              addressLine1: branch.addressLine1 || branch.address || "",
            } as BusinessBranchFormValues)
          : branchDefaults,
      );
  }, [open, branch]);
  const mutation = useMutation({
    mutationFn: (values: BusinessBranchFormValues) =>
      branch
        ? businessService.updateBranch(branch.id, { ...values, currency })
        : businessService.createBranch({ ...values, currency }),
    onSuccess: async () => {
      notifySuccess(branch ? "Branch updated" : "Branch created");
      await onSaved();
      onClose();
    },
    onError: (error) => notifyError(error, "Could not save branch"),
  });
  const archiveMutation = useMutation({
    mutationFn: () => businessService.archiveBranch(branch!.id),
    onSuccess: async () => {
      notifySuccess("Branch deactivated");
      await onSaved();
      onClose();
    },
    onError: (error) => notifyError(error, "Could not deactivate branch"),
  });
  const values = form.watch();
  const e = form.formState.errors;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={branch ? "Edit Branch" : "Create Branch"}
      size="xl"
    >
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Branch name"
            placeholder="e.g. Airport Branch"
            error={e.name?.message}
            {...form.register("name")}
          />
          <Input
            label="Branch code"
            placeholder="e.g. DEL-T3"
            error={e.code?.message}
            {...form.register("code")}
          />
          <label className="text-sm font-medium">
            Status
            <select
              className={`mt-1 ${inputClass}`}
              {...form.register("status")}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
          <Input
            label="Address line 1"
            placeholder="Street address and building"
            error={e.addressLine1?.message}
            {...form.register("addressLine1")}
          />
          <Input
            label="Address line 2 (optional)"
            placeholder="Floor, unit or landmark"
            {...form.register("addressLine2")}
          />
          <Input
            label="City"
            placeholder="e.g. New Delhi"
            error={e.city?.message}
            {...form.register("city")}
          />
          <Input
            label="State"
            placeholder="e.g. Delhi"
            error={e.stateProvince?.message}
            {...form.register("stateProvince")}
          />
          <Input
            label="Postal code"
            placeholder="e.g. 110037"
            error={e.postalCode?.message}
            {...form.register("postalCode")}
          />
          <Input
            label="Country code"
            placeholder="e.g. IN"
            error={e.country?.message}
            {...form.register("country")}
          />
          <Input
            label="Timezone"
            placeholder="e.g. Asia/Kolkata"
            error={e.timezone?.message}
            {...form.register("timezone")}
          />
          <Input
            label="Phone"
            placeholder="e.g. +91 98765 43210"
            error={e.phone?.message}
            {...form.register("phone")}
          />
          <Input
            label="Manager name (optional)"
            placeholder="e.g. Aditi Verma"
            {...form.register("managerName")}
          />
          <Input
            label="Email (optional)"
            placeholder="e.g. airport@kkskitchen.com"
            {...form.register("email")}
          />
          <Input
            label="Opening time"
            placeholder="09:00"
            {...form.register("openingTime")}
          />
          <Input
            label="Closing time"
            placeholder="23:00"
            {...form.register("closingTime")}
          />
          <Input
            label="Tax override % (optional)"
            type="number"
            step="0.01"
            placeholder="e.g. 5"
            {...form.register("taxOverride", { valueAsNumber: true })}
          />
          <Input
            label="Service charge override %"
            type="number"
            step="0.01"
            placeholder="e.g. 10"
            {...form.register("serviceChargeOverride", { valueAsNumber: true })}
          />
          <Input
            label="Invoice prefix (optional)"
            placeholder="e.g. DELT3"
            {...form.register("invoicePrefix")}
          />
          <label className="text-sm font-medium">
            Negative stock policy
            <select
              className={`mt-1 ${inputClass}`}
              {...form.register("negativeStockPolicy")}
            >
              <option value="BLOCK">Block</option>
              <option value="WARN">Warn</option>
              <option value="ALLOW">Allow</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Weekly operating days
          <div className="mt-2 flex flex-wrap gap-2">
            {(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const).map(
              (day) => (
                <label
                  key={day}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={values.weeklyOperatingDays?.includes(day) ?? false}
                    onChange={(event) =>
                      form.setValue(
                        "weeklyOperatingDays",
                        event.target.checked
                          ? [...(values.weeklyOperatingDays ?? []), day]
                          : (values.weeklyOperatingDays ?? []).filter(
                              (item) => item !== day,
                            ),
                        { shouldValidate: true },
                      )
                    }
                  />
                  {day}
                </label>
              ),
            )}
          </div>
        </label>
        <label className="block text-sm font-medium">
          Receipt footer
          <textarea
            className={`mt-1 ${inputClass}`}
            rows={2}
            placeholder="e.g. Thank you for dining with us!"
            {...form.register("receiptFooter")}
          />
        </label>
        <CapabilityGrid
          values={{
            dineInEnabled: values.dineInEnabled,
            takeawayEnabled: values.takeawayEnabled,
            deliveryEnabled: values.deliveryEnabled,
            customerQrEnabled: values.customerQrEnabled,
            tablesEnabled: values.tablesEnabled,
            kdsEnabled: values.kdsEnabled,
            waiterAppEnabled: values.waiterAppEnabled,
            inventoryTrackingEnabled: values.inventoryTrackingEnabled ?? true,
          }}
          setValue={(key, value) =>
            form.setValue(
              key as keyof BusinessBranchFormValues,
              value as never,
              { shouldValidate: true },
            )
          }
        />
        <div className="flex justify-between gap-2">
          {branch && has("branch:archive") ? (
            <Button
              type="button"
              variant="danger"
              loading={archiveMutation.isPending}
              onClick={() =>
                window.confirm("Deactivate this branch?") &&
                archiveMutation.mutate()
              }
            >
              Deactivate
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save Branch
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
