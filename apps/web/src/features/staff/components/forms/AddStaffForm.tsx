import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStaffSchema, type CreateStaffInput } from "@pos/validation";
import { Button, FormErrorSummary } from "@pos/ui";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import {
  StaffFormFields,
  type StaffBranchOption,
  type StaffRoleOption,
} from "./StaffFormFields";

const staffFieldPaths = [
  "firstName",
  "lastName",
  "email",
  "password",
  "roleId",
  "branchId",
] as const satisfies readonly (keyof CreateStaffInput)[];

interface Props {
  roles: StaffRoleOption[];
  branches: StaffBranchOption[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateStaffInput) => Promise<void>;
}

export const AddStaffForm = ({
  roles,
  branches,
  loading = false,
  onCancel,
  onSubmit,
}: Props) => {
  const form = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      roleId: "",
      branchId: undefined,
    },
    mode: "onChange",
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<CreateStaffInput>();
  const roleId = form.watch("roleId");
  const selectedRole = roles.find((role) => role.id === roleId);
  const branchRequired = selectedRole?.scope === "BRANCH";
  const branchId = form.watch("branchId");
  const canSubmit =
    form.formState.isValid &&
    (!branchRequired || Boolean(branchId)) &&
    !loading &&
    !form.formState.isSubmitting;

  const submit = form.handleSubmit(async (data) => {
    clearFormErrors();
    try {
      await onSubmit(data);
    } catch (error) {
      handleApiError(
        error,
        form.setError,
        staffFieldPaths,
        "Failed to add staff member",
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <StaffFormFields
        register={form.register}
        errors={form.formState.errors}
        roleId={roleId}
        branchId={branchId}
        roles={roles}
        branches={branches}
        setValue={form.setValue}
      />
      <FormErrorSummary messages={formErrorMessages} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={!canSubmit}>
          {loading ? "Adding…" : "Add Staff"}
        </Button>
      </div>
    </form>
  );
};
