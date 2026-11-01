import type { UseFormReturn } from "react-hook-form";
import type { BranchDto } from "@pos/api-client";
import { TableFormModal } from "./TableFormModal";
import type { RestaurantTable } from "../types";
import type { TableFormValues } from "../table-form.types";

type TablesFormDialogsProps = {
  addOpen: boolean;
  editing: RestaurantTable | null;
  branches: BranchDto[];
  aggregate: boolean;
  dependencyError?: string;
  form: UseFormReturn<TableFormValues>;
  formErrorMessages: string[];
  addPending: boolean;
  updatePending: boolean;
  addDependencyBlocked: boolean;
  onRetryDependency?: () => void;
  onCloseAdd: () => void;
  onCloseEdit: () => void;
  onAdd: (values: TableFormValues) => void;
  onUpdate: (values: TableFormValues) => void;
};

export const TablesFormDialogs = ({
  addOpen,
  editing,
  branches,
  aggregate,
  dependencyError,
  form,
  formErrorMessages,
  addPending,
  updatePending,
  addDependencyBlocked,
  onRetryDependency,
  onCloseAdd,
  onCloseEdit,
  onAdd,
  onUpdate,
}: TablesFormDialogsProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty, isValid },
  } = form;

  return (
    <>
      <TableFormModal
        mode="add"
        open={addOpen}
        branches={branches}
        aggregate={aggregate}
        errors={errors}
        formErrorMessages={formErrorMessages}
        register={register}
        handleSubmit={handleSubmit}
        pending={addPending}
        submitDisabled={!isValid || addDependencyBlocked}
        branchId={watch("branchId")}
        onBranchIdChange={(value) =>
          setValue("branchId", value, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        onBranchIdBlur={() =>
          setValue("branchId", getValues("branchId"), {
            shouldTouch: true,
            shouldValidate: true,
          })
        }
        {...(dependencyError ? { dependencyError } : {})}
        {...(onRetryDependency ? { onRetryDependency } : {})}
        onClose={onCloseAdd}
        onSubmit={onAdd}
      />
      <TableFormModal
        mode="edit"
        open={!!editing}
        branches={branches}
        aggregate={false}
        errors={errors}
        formErrorMessages={formErrorMessages}
        register={register}
        handleSubmit={handleSubmit}
        pending={updatePending}
        submitDisabled={!isValid || !isDirty}
        onClose={onCloseEdit}
        onSubmit={onUpdate}
      />
    </>
  );
};
