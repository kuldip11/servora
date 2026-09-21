import { Input } from "@pos/ui";
import type { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";

type PromotionForm = ReturnType<typeof usePromotionFormState>;
type ErrorMap = Record<string, string | undefined>;

type Props = {
  form: PromotionForm;
  clientErrors: ErrorMap;
  fieldErrors: Record<string, string>;
  fieldError: (field: string, clientError?: string) => string | undefined;
  clearFieldError: (field: string) => void;
  touchField: (field: string) => void;
};

export const PromotionScheduleFields = ({
  form,
  clientErrors,
  fieldErrors,
  fieldError,
  clearFieldError,
  touchField,
}: Props) => (
  <>
    <Input
      label="Coupon code (optional)"
      value={form.couponCode}
      error={fieldErrors.couponCode}
      onChange={(event) => {
        clearFieldError("couponCode");
        form.setCouponCode(event.target.value.toUpperCase());
      }}
    />
    <Input
      label="Start date"
      type="date"
      value={form.startDate}
      onChange={(event) => form.setStartDate(event.target.value)}
    />
    <Input
      label="End date"
      type="date"
      value={form.endDate}
      error={fieldError("endDate", clientErrors.endDate)}
      onBlur={() => touchField("endDate")}
      onChange={(event) => {
        clearFieldError("endDate");
        form.setEndDate(event.target.value);
      }}
    />
    <Input
      label="Start time"
      type="time"
      value={form.startTime}
      onChange={(event) => form.setStartTime(event.target.value)}
    />
    <Input
      label="End time"
      type="time"
      value={form.endTime}
      error={fieldError("endTime", clientErrors.endTime)}
      onBlur={() => touchField("endTime")}
      onChange={(event) => {
        clearFieldError("endTime");
        form.setEndTime(event.target.value);
      }}
    />
    <Input
      label="Max uses total"
      type="number"
      value={form.maxUsesTotal}
      error={fieldError("maxUsesTotal", clientErrors.maxUsesTotal)}
      onBlur={() => touchField("maxUsesTotal")}
      onChange={(event) => {
        clearFieldError("maxUsesTotal");
        form.setMaxUsesTotal(event.target.value);
      }}
    />
    <Input
      label="Max uses / customer"
      type="number"
      value={form.maxUsesPerCustomer}
      error={fieldError("maxUsesPerCustomer", clientErrors.maxUsesPerCustomer)}
      onBlur={() => touchField("maxUsesPerCustomer")}
      onChange={(event) => {
        clearFieldError("maxUsesPerCustomer");
        form.setMaxUsesPerCustomer(event.target.value);
      }}
    />
  </>
);
