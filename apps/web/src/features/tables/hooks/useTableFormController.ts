import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tableFormSchema } from "@pos/validation";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import { EMPTY_TABLE_FORM } from "../constants";
import type { RestaurantTable } from "../types";
import type { TableFormValues } from "../table-form.types";

export const TABLE_FORM_FIELDS = [
  "name",
  "capacity",
  "section",
  "branchId",
] as const;

export const toTablePayload = (values: TableFormValues) => ({
  name: values.name.trim(),
  capacity: Number(values.capacity),
  ...(values.section.trim() && { section: values.section.trim() }),
  ...(values.branchId && { branchId: values.branchId }),
});

export const useTableFormController = () => {
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: EMPTY_TABLE_FORM,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const apiErrors = useFormApiErrors<TableFormValues>();

  const prepareAdd = () => {
    apiErrors.clearFormErrors();
    form.reset(EMPTY_TABLE_FORM);
  };

  const prepareEdit = (table: RestaurantTable) => {
    apiErrors.clearFormErrors();
    form.reset({
      name: table.name,
      capacity: String(table.capacity),
      section: table.section ?? "",
      branchId: "",
    });
  };

  const resetForm = () => {
    apiErrors.clearFormErrors();
    form.reset(EMPTY_TABLE_FORM);
  };

  return {
    form,
    apiErrors,
    prepareAdd,
    prepareEdit,
    resetForm,
  };
};
