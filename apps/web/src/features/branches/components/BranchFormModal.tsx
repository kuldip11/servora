import { useEffect, useState } from "react";
import type {
  FieldErrors,
  UseFormHandleSubmit,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { Button, Modal, Input } from "@pos/ui";
import type { BranchFormValues } from "@pos/validation";
export const BranchFormModal = ({
  mode,
  open,
  form,
  errors,
  register,
  setValue,
  handleSubmit,
  pending,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  open: boolean;
  form: BranchFormValues;
  errors: FieldErrors<BranchFormValues>;
  register: UseFormRegister<BranchFormValues>;
  setValue: UseFormSetValue<BranchFormValues>;
  handleSubmit: UseFormHandleSubmit<BranchFormValues>;
  pending: boolean;
  onClose: () => void;
  onSubmit: (values: BranchFormValues) => void;
}) => {
  const [orderTypesTouched, setOrderTypesTouched] = useState(false);
  useEffect(() => {
    if (open) setOrderTypesTouched(false);
  }, [open, mode]);

  const valid =
    form.dineInEnabled ||
    form.takeawayEnabled ||
    form.deliveryEnabled ||
    form.onlineEnabled;
  const setDineIn = (value: boolean) => {
    setValue("dineInEnabled", value, { shouldValidate: true });
    setValue("tablesEnabled", value, { shouldValidate: true });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add Branch" : "Edit Branch"}
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          if (!valid) setOrderTypesTouched(true);
          void handleSubmit(onSubmit)(event);
        }}
      >
        <Input
          label={`Branch name${mode === "add" ? "" : " "}`}
          placeholder="Mall Road Branch"
          error={errors.name?.message}
          {...register("name")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Branch code"
            required
            placeholder="MALL-01"
            error={errors.code?.message}
            {...register("code")}
          />
          <Input
            label="Currency"
            required
            placeholder="INR"
            error={errors.currency?.message}
            {...register("currency")}
          />
        </div>
        <Input
          label="Timezone"
          required
          placeholder="Asia/Kolkata"
          error={errors.timezone?.message}
          {...register("timezone")}
        />
        <Input
          label={`Address${mode === "add" ? " (optional)" : ""}`}
          placeholder="123 Mall Road, Sector 5"
          error={errors.address?.message}
          {...register("address")}
        />
        <Input
          label={`Phone${mode === "add" ? " (optional)" : ""}`}
          placeholder="+91 98765 43210"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Order types accepted
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.takeawayEnabled}
                onBlur={() => setOrderTypesTouched(true)}
                onChange={(e) =>
                  setValue("takeawayEnabled", e.target.checked, {
                    shouldValidate: true,
                  })
                }
              />
              Takeaway
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.deliveryEnabled}
                onBlur={() => setOrderTypesTouched(true)}
                onChange={(e) =>
                  setValue("deliveryEnabled", e.target.checked, {
                    shouldValidate: true,
                  })
                }
              />
              Delivery
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.onlineEnabled}
                onBlur={() => setOrderTypesTouched(true)}
                onChange={(e) =>
                  setValue("onlineEnabled", e.target.checked, {
                    shouldValidate: true,
                  })
                }
              />
              Online
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form.dineInEnabled}
                onBlur={() => setOrderTypesTouched(true)}
                onChange={(e) => setDineIn(e.target.checked)}
              />
              Dine-in &amp; Tables
            </label>
          </div>
          <p className="text-xs text-text-disabled">
            Dine-in and tables are linked — a branch with no seating should turn
            both off.
            {mode === "edit"
              ? " Turning dine-in off is blocked while the branch has open dine-in orders."
              : ""}
          </p>
          {orderTypesTouched && !valid && (
            <p className="text-xs text-danger">
              Select at least one order type.
            </p>
          )}
        </div>
        {mode === "add" && (
          <p className="text-xs text-text-disabled">
            The new branch starts empty — you'll set up its menu, tables, and
            staff separately.
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {mode === "add" ? "Add Branch" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
