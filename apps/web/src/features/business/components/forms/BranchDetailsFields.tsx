import { Input, Select } from "@pos/ui";
import type { BusinessBranchFormValues } from "@pos/validation";
import type { UseFormReturn } from "react-hook-form";

export const BranchDetailsFields = ({
  form,
  values,
}: {
  form: UseFormReturn<BusinessBranchFormValues>;
  values: BusinessBranchFormValues;
}) => {
  const errors = form.formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        label="Branch name"
        required
        placeholder="e.g. Airport Branch"
        error={errors.name?.message}
        {...form.register("name")}
      />
      <Input
        label="Branch code"
        required
        placeholder="e.g. DEL-T3"
        error={errors.code?.message}
        {...form.register("code")}
      />
      <Select
        label="Status"
        required
        value={values.status}
        onChange={(value) =>
          form.setValue("status", value as BusinessBranchFormValues["status"], {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        error={errors.status?.message}
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
        ]}
      />
      <Input
        label="Address line 1"
        required
        placeholder="Street address and building"
        error={errors.addressLine1?.message}
        {...form.register("addressLine1")}
      />
      <Input
        label="Address line 2 (optional)"
        error={errors.addressLine2?.message}
        placeholder="Floor, unit or landmark"
        {...form.register("addressLine2")}
      />
      <Input
        label="City"
        required
        placeholder="e.g. New Delhi"
        error={errors.city?.message}
        {...form.register("city")}
      />
      <Input
        label="State"
        required
        placeholder="e.g. Delhi"
        error={errors.stateProvince?.message}
        {...form.register("stateProvince")}
      />
      <Input
        label="Postal code"
        required
        placeholder="e.g. 110037"
        error={errors.postalCode?.message}
        {...form.register("postalCode")}
      />
      <Input
        label="Country code"
        required
        placeholder="e.g. IN"
        error={errors.country?.message}
        {...form.register("country")}
      />
      <Input
        label="Timezone"
        required
        placeholder="e.g. Asia/Kolkata"
        error={errors.timezone?.message}
        {...form.register("timezone")}
      />
      <Input
        label="Phone"
        required
        placeholder="e.g. +91 98765 43210"
        error={errors.phone?.message}
        {...form.register("phone")}
      />
      <Input
        label="Manager name (optional)"
        error={errors.managerName?.message}
        placeholder="e.g. Aditi Verma"
        {...form.register("managerName")}
      />
      <Input
        label="Email (optional)"
        error={errors.email?.message}
        placeholder="e.g. airport@kkskitchen.com"
        {...form.register("email")}
      />
      <Input
        label="Opening time (optional)"
        error={errors.openingTime?.message}
        placeholder="09:00"
        {...form.register("openingTime")}
      />
      <Input
        label="Closing time (optional)"
        error={errors.closingTime?.message}
        placeholder="23:00"
        {...form.register("closingTime")}
      />
      <Input
        label="Tax override % (optional)"
        error={errors.taxOverride?.message}
        type="number"
        step="0.01"
        placeholder="e.g. 5"
        {...form.register("taxOverride", { valueAsNumber: true })}
      />
      <Input
        label="Service charge override % (optional)"
        error={errors.serviceChargeOverride?.message}
        type="number"
        step="0.01"
        placeholder="e.g. 10"
        {...form.register("serviceChargeOverride", { valueAsNumber: true })}
      />
      <Input
        label="Invoice prefix (optional)"
        error={errors.invoicePrefix?.message}
        placeholder="e.g. DELT3"
        {...form.register("invoicePrefix")}
      />
      <Select
        label="Negative stock policy"
        value={values.negativeStockPolicy}
        onChange={(value) =>
          form.setValue(
            "negativeStockPolicy",
            value as BusinessBranchFormValues["negativeStockPolicy"],
            { shouldDirty: true, shouldTouch: true, shouldValidate: true },
          )
        }
        error={errors.negativeStockPolicy?.message}
        options={[
          { value: "BLOCK", label: "Block" },
          { value: "WARN", label: "Warn" },
          { value: "ALLOW", label: "Allow" },
        ]}
      />
    </div>
  );
};
