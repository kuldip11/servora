import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createHolidaySchema, type CreateHolidayInput } from "@pos/validation";
import { Plus, X, CalendarDays } from "lucide-react";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { useMenuHolidays } from "@/features/menu/hooks/useMenuHolidays";
import { useAddHoliday } from "@/features/menu/hooks/useAddHoliday";
import { useDeleteHoliday } from "@/features/menu/hooks/useDeleteHoliday";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

export const HolidaysSection = () => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateHolidayInput>({
    resolver: zodResolver(createHolidaySchema),
    mode: "onChange",
    defaultValues: { name: "", holidayDate: "", region: "" },
  });

  const holidaysQuery = useMenuHolidays();
  const holidays = holidaysQuery.data;
  const addMutation = useAddHoliday();
  const deleteMutation = useDeleteHoliday();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<CreateHolidayInput>();

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await addMutation.mutateAsync({
        ...values,
        ...(values.region?.trim() ? { region: values.region.trim() } : {}),
      });
      reset({ name: "", holidayDate: "", region: "" });
    } catch (error) {
      handleApiError(
        error,
        setError,
        ["name", "holidayDate", "region"],
        "Failed to add holiday",
      );
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Holidays</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Name a date once here, then reference it by name in an item's
          "Holiday" schedule — e.g. a Diwali special menu that turns on for that
          date every year, without editing every item's schedule manually.
        </p>
      </div>

      {holidaysQuery.isError && !holidays ? (
        <QueryErrorState
          title="Unable to load holidays"
          description="Holiday schedules could not be loaded. Retry before making changes."
          onRetry={() => void holidaysQuery.refetch()}
          isRetrying={holidaysQuery.isFetching}
        />
      ) : null}
      {holidaysQuery.isError && holidays ? (
        <StaleDataBanner
          message="Holiday refresh failed — showing the last available holiday data."
          onRetry={() => void holidaysQuery.refetch()}
          isRetrying={holidaysQuery.isFetching}
        />
      ) : null}

      <div className="space-y-1.5">
        {!holidaysQuery.isError && !holidays?.length && (
          <p className="text-sm text-text-disabled">No holidays added yet.</p>
        )}
        {holidays?.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between px-3 py-2 bg-surface-secondary rounded-md text-sm"
          >
            <div className="flex items-center gap-2 text-text-primary">
              <CalendarDays className="w-4 h-4 text-text-disabled" />
              <span className="font-medium">{h.name}</span>
              <span className="text-text-disabled">{h.holidayDate}</span>
              {h.region && (
                <span className="text-xs text-text-disabled">({h.region})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove holiday "${h.name}"?`))
                  deleteMutation.mutate(h.id);
              }}
              aria-label={`Remove holiday ${h.name}`}
              className="text-text-disabled hover:text-danger"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <FormErrorSummary messages={formErrorMessages} />
        <div className="flex items-end gap-2">
          <Input
            label="Name"
            placeholder="Diwali"
            error={errors.name?.message}
            {...register("name", { onChange: clearFormErrors })}
          />
          <Input
            label="Date"
            type="date"
            error={errors.holidayDate?.message}
            {...register("holidayDate", { onChange: clearFormErrors })}
          />
          <Input
            label="Region (optional)"
            placeholder="India"
            error={errors.region?.message}
            {...register("region", { onChange: clearFormErrors })}
          />
          <Button
            type="submit"
            size="sm"
            loading={addMutation.isPending}
            disabled={
              !isValid || addMutation.isPending || holidaysQuery.isError
            }
            aria-label="Add holiday"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
