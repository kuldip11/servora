import { Input, Select } from "@pos/ui";
import type { usePromotionFormState } from "@/features/menu/hooks/usePromotionFormState";

type PromotionForm = ReturnType<typeof usePromotionFormState>;
type ErrorMap = Record<string, string | undefined>;
type Option = { value: string; label: string };

type Props = {
  form: PromotionForm;
  clientErrors: ErrorMap;
  itemOptions: Option[];
  categoryOptions: Option[];
  fieldError: (field: string, clientError?: string) => string | undefined;
  clearFieldError: (field: string) => void;
  touchField: (field: string) => void;
};

export const PromotionBogoFields = ({
  form,
  clientErrors,
  itemOptions,
  categoryOptions,
  fieldError,
  clearFieldError,
  touchField,
}: Props) => (
  <>
    <Select
      label="Buy target"
      required
      value={form.triggerType}
      onChange={(value) => form.setTriggerType(value as "ITEM" | "CATEGORY")}
      options={[
        { value: "ITEM", label: "Menu item" },
        { value: "CATEGORY", label: "Category" },
      ]}
    />
    <Select
      label={form.triggerType === "ITEM" ? "Buy item" : "Buy category"}
      required
      value={form.triggerId}
      options={[
        {
          value: "",
          label:
            form.triggerType === "ITEM"
              ? "Choose an item"
              : "Choose a category",
        },
        ...(form.triggerType === "ITEM" ? itemOptions : categoryOptions),
      ]}
      error={fieldError("triggerId", clientErrors.triggerId)}
      onBlur={() => touchField("triggerId")}
      onChange={(value) => {
        clearFieldError("triggerId");
        form.setTriggerId(value);
      }}
    />
    <Input
      label="Buy quantity"
      required
      type="number"
      value={form.triggerQuantity}
      error={fieldError("triggerQuantity", clientErrors.triggerQuantity)}
      onBlur={() => touchField("triggerQuantity")}
      onChange={(event) => {
        clearFieldError("triggerQuantity");
        form.setTriggerQuantity(event.target.value);
      }}
    />
    <Select
      label="Reward target"
      required
      value={form.rewardType}
      onChange={(value) =>
        form.setRewardType(value as "SAME" | "ITEM" | "CATEGORY")
      }
      options={[
        { value: "SAME", label: "Same as buy target" },
        { value: "ITEM", label: "Menu item" },
        { value: "CATEGORY", label: "Category" },
      ]}
    />
    {form.rewardType !== "SAME" ? (
      <Select
        label={form.rewardType === "ITEM" ? "Reward item" : "Reward category"}
        required
        value={form.rewardId}
        options={[
          {
            value: "",
            label:
              form.rewardType === "ITEM"
                ? "Choose an item"
                : "Choose a category",
          },
          ...(form.rewardType === "ITEM" ? itemOptions : categoryOptions),
        ]}
        error={fieldError("rewardId", clientErrors.rewardId)}
        onBlur={() => touchField("rewardId")}
        onChange={(value) => {
          clearFieldError("rewardId");
          form.setRewardId(value);
        }}
      />
    ) : null}
    <Input
      label="Reward quantity"
      required
      type="number"
      value={form.rewardQuantity}
      error={fieldError("rewardQuantity", clientErrors.rewardQuantity)}
      onBlur={() => touchField("rewardQuantity")}
      onChange={(event) => {
        clearFieldError("rewardQuantity");
        form.setRewardQuantity(event.target.value);
      }}
    />
    <Input
      label="Reward discount %"
      required
      type="number"
      value={form.rewardDiscountPercent}
      error={fieldError(
        "rewardDiscountPercent",
        clientErrors.rewardDiscountPercent,
      )}
      onBlur={() => touchField("rewardDiscountPercent")}
      onChange={(event) => {
        clearFieldError("rewardDiscountPercent");
        form.setRewardDiscountPercent(event.target.value);
      }}
    />
  </>
);
