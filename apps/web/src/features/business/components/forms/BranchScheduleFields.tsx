import { FieldErrorText } from "@pos/ui";
import type { BusinessBranchFormValues } from "@pos/validation";
import type { UseFormReturn } from "react-hook-form";
import { inputClass } from "./business-form-defaults";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export const BranchScheduleFields = ({
  form,
  values,
}: {
  form: UseFormReturn<BusinessBranchFormValues>;
  values: BusinessBranchFormValues;
}) => {
  const errors = form.formState.errors;
  return (
    <>
      <label className="block text-sm font-medium">
        Weekly operating days
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
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
          ))}
        </div>
        <FieldErrorText message={errors.weeklyOperatingDays?.message} />
      </label>
      <label className="block text-sm font-medium">
        Receipt footer
        <textarea
          className={`mt-1 ${inputClass}`}
          rows={2}
          placeholder="e.g. Thank you for dining with us!"
          {...form.register("receiptFooter")}
        />
        <FieldErrorText message={errors.receiptFooter?.message} />
      </label>
    </>
  );
};
