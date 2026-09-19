import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormErrorSummary, Input, Select } from "@pos/ui";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import {
  editStaffFormSchema,
  type EditStaffFormValues,
} from "@/features/staff/schemas/staff-form.schema";
import type { StaffBranchOption, StaffRoleOption } from "./StaffFormFields";

export interface EditableStaff {
  id: string;
  firstName?: string;
  lastName?: string;
  roles?: { name?: string }[];
  assignedBranches?: { id?: string }[];
}

export interface EditStaffSubmitInput {
  firstName: string;
  lastName: string;
  roleId: string;
  branchIds: string[];
}

interface Props {
  member: EditableStaff;
  roles: StaffRoleOption[];
  branches: StaffBranchOption[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (input: EditStaffSubmitInput) => Promise<void>;
}

const editStaffFieldPaths = [
  "firstName",
  "lastName",
  "roleId",
  "branchIds",
] as const satisfies readonly (keyof EditStaffFormValues)[];

export const EditStaffForm = ({
  member,
  roles,
  branches,
  loading = false,
  onCancel,
  onSubmit,
}: Props) => {
  const initialRoleId =
    roles.find((role) => role.name === member.roles?.[0]?.name)?.id ?? "";
  const initialBranchIds =
    (member.assignedBranches
      ?.map((branch) => branch.id)
      .filter(Boolean) as string[]) ?? [];
  const initialBranchRequired =
    roles.find((role) => role.id === initialRoleId)?.scope === "BRANCH";

  const form = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffFormSchema),
    defaultValues: {
      firstName: member.firstName ?? "",
      lastName: member.lastName ?? "",
      roleId: initialRoleId,
      branchIds: initialBranchIds,
      branchRequired: initialBranchRequired,
    },
    mode: "onChange",
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<EditStaffFormValues>();
  const roleId = form.watch("roleId");
  const branchIds = form.watch("branchIds");
  const branchRequired =
    roles.find((role) => role.id === roleId)?.scope === "BRANCH";

  useEffect(() => {
    form.setValue("branchRequired", branchRequired, {
      shouldDirty: false,
      shouldValidate: true,
    });
    if (branchRequired && branchIds.length === 0 && branches.length === 1) {
      form.setValue("branchIds", [branches[0]!.id], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (!branchRequired && branchIds.length) {
      form.setValue("branchIds", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [branchRequired, branchIds.length, branches, form]);

  const submit = form.handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await onSubmit({
        firstName: values.firstName,
        lastName: values.lastName,
        roleId: values.roleId,
        branchIds: values.branchIds,
      });
    } catch (error) {
      handleApiError(
        error,
        form.setError,
        editStaffFieldPaths,
        "Failed to update staff member",
      );
    }
  });

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First name"
          error={form.formState.errors.firstName?.message}
          {...form.register("firstName")}
        />
        <Input
          label="Last name"
          error={form.formState.errors.lastName?.message}
          {...form.register("lastName")}
        />
      </div>
      <Select
        label="Role"
        options={[
          { value: "", label: "Select role" },
          ...roles
            .filter((role) => role.name !== "OWNER")
            .map((role) => ({ value: role.id, label: role.name })),
        ]}
        error={form.formState.errors.roleId?.message}
        {...form.register("roleId")}
      />
      {branchRequired && (
        <Select
          label="Branch"
          options={[
            { value: "", label: "Select branch" },
            ...branches.map((branch) => ({
              value: branch.id,
              label: branch.name,
            })),
          ]}
          error={form.formState.errors.branchIds?.message}
          value={branchIds[0] ?? ""}
          onChange={(event) =>
            form.setValue(
              "branchIds",
              event.target.value ? [event.target.value] : [],
              { shouldDirty: true, shouldValidate: true },
            )
          }
        />
      )}
      <FormErrorSummary messages={formErrorMessages} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={
            !form.formState.isValid ||
            !form.formState.isDirty ||
            loading ||
            form.formState.isSubmitting
          }
        >
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
};
