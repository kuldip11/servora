import type {
  FieldErrors,
  UseFormRegister,
  UseFormHandleSubmit,
} from "react-hook-form";
import {
  Button,
  FormErrorSummary,
  Modal,
  Input,
  QueryErrorState,
  Select,
} from "@pos/ui";
import type { Branch } from "@pos/types";
import type { RestaurantTable } from "@/features/tables/types";
import type { TableFormValues } from "@/features/tables/table-form.types";

export const TableFormModal = ({
  mode,
  open,
  editing,
  branches,
  aggregate,
  errors,
  formErrorMessages,
  register,
  handleSubmit,
  pending,
  submitDisabled,
  dependencyError,
  onRetryDependency,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  open: boolean;
  editing: RestaurantTable | null;
  branches: Branch[];
  aggregate: boolean;
  errors: FieldErrors<TableFormValues>;
  formErrorMessages: string[];
  register: UseFormRegister<TableFormValues>;
  handleSubmit: UseFormHandleSubmit<TableFormValues>;
  pending: boolean;
  submitDisabled: boolean;
  dependencyError?: string;
  onRetryDependency?: () => void;
  onClose: () => void;
  onSubmit: (values: TableFormValues) => void;
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add Table" : "Edit Table"}
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormErrorSummary messages={formErrorMessages} />
        {dependencyError ? (
          <QueryErrorState
            title="Unable to load required table data"
            description={dependencyError}
            onRetry={onRetryDependency}
          />
        ) : null}
        <Input
          label="Table name"
          required
          placeholder="T-01"
          error={errors.name?.message}
          {...register("name")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Capacity"
            required
            type="number"
            min={1}
            error={errors.capacity?.message}
            {...register("capacity")}
          />
          <Input
            label="Section (optional)"
            placeholder="Patio, Main hall…"
            error={errors.section?.message}
            {...register("section")}
          />
        </div>
        {mode === "add" && aggregate && (
          <Select
            label="Branch"
            required
            options={[
              { value: "", label: "Select branch" },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
            {...(errors.branchId?.message
              ? { error: errors.branchId.message }
              : {})}
            {...register("branchId")}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={pending}
            disabled={pending || submitDisabled}
          >
            {mode === "add" ? "Add Table" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
