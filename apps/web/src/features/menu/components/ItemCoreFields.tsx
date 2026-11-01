import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { Input, Select } from "@pos/ui";
import type { FoodType, MenuItemStatus, SpiceLevel } from "@pos/types";
import type { MenuItemFormValues } from "@pos/validation";
import {
  MENU_FOOD_TYPE_OPTIONS,
  MENU_ITEM_STATUS_OPTIONS,
  MENU_SPICE_LEVEL_OPTIONS,
} from "@/features/menu/constants";
import { FoodTypeDot } from "./FoodTypeDot";

type Props = {
  form: MenuItemFormValues;
  errors: FieldErrors<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
  setValue: UseFormSetValue<MenuItemFormValues>;
  taxMode: "" | "INCLUSIVE" | "EXCLUSIVE";
  setTaxMode: (value: "" | "INCLUSIVE" | "EXCLUSIVE") => void;
};

export const ItemCoreFields = ({
  form,
  errors,
  register,
  setValue,
  taxMode,
  setTaxMode,
}: Props) => (
  <>
    <Input
      label="Item name"
      required
      placeholder="Chicken Tikka"
      error={errors.name?.message}
      {...register("name")}
    />

    <div>
      <label
        htmlFor="item-description"
        className="text-sm font-medium text-text-primary"
      >
        Description <span className="text-text-disabled">(optional)</span>
      </label>
      <textarea
        id="item-description"
        placeholder="Short description shown to staff and customers"
        {...register("description")}
        aria-invalid={Boolean(errors.description)}
        rows={2}
        className="mt-1.5 w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input
        label="Selling price (₹)"
        required
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
        error={errors.basePrice?.message}
        {...register("basePrice")}
      />
      <Input
        label="Cost (₹)"
        type="number"
        min="0"
        step="0.01"
        placeholder="Not configured"
        error={errors.manualCost?.message}
        {...register("manualCost")}
      />
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Input
        label="Tax rate (%)"
        required
        type="number"
        min="0"
        max="100"
        step="0.5"
        placeholder="0"
        error={errors.taxRate?.message}
        {...register("taxRate")}
      />
      <Select
        label="Tax mode"
        value={taxMode}
        onChange={(value) =>
          setTaxMode(value as "" | "INCLUSIVE" | "EXCLUSIVE")
        }
        options={[
          { value: "", label: "Use franchise default" },
          { value: "EXCLUSIVE", label: "Tax added to price" },
          { value: "INCLUSIVE", label: "Tax included in price" },
        ]}
      />
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <span
          id="item-food-type-label"
          className="mb-1.5 block text-sm font-medium text-text-primary"
        >
          Food type{" "}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </span>
        <div
          role="group"
          aria-labelledby="item-food-type-label"
          className="flex gap-2"
        >
          {MENU_FOOD_TYPE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() =>
                setValue("foodType", option.value as FoodType, {
                  shouldValidate: true,
                  shouldTouch: true,
                })
              }
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                form.foodType === option.value
                  ? "border-primary bg-primary-surface text-primary"
                  : "border-border text-text-secondary"
              }`}
            >
              <FoodTypeDot type={option.value} size="sm" /> {option.label}
            </button>
          ))}
        </div>
      </div>
      <Select
        label="Spice level"
        error={errors.spiceLevel?.message}
        value={form.spiceLevel}
        onChange={(value) =>
          setValue("spiceLevel", value as SpiceLevel | "", {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        onBlur={() =>
          setValue("spiceLevel", form.spiceLevel, {
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        options={MENU_SPICE_LEVEL_OPTIONS}
      />
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Select
        label="Status"
        required
        error={errors.status?.message}
        value={form.status}
        onChange={(value) =>
          setValue("status", value as MenuItemStatus, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        onBlur={() =>
          setValue("status", form.status, {
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        options={MENU_ITEM_STATUS_OPTIONS}
      />
      <Input
        label="Reason (optional)"
        placeholder="e.g. Out of stock till Monday"
        error={errors.availabilityReason?.message}
        {...register("availabilityReason")}
      />
    </div>
  </>
);
