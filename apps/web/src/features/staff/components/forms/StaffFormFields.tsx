import { useEffect } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import type { CreateStaffInput } from "@pos/validation";
import { Input, Select } from "@pos/ui";

export interface StaffRoleOption {
  id: string;
  name: string;
  scope: string;
}

export interface StaffBranchOption {
  id: string;
  name: string;
}

interface CreateFieldsProps {
  register: UseFormRegister<CreateStaffInput>;
  errors: FieldErrors<CreateStaffInput>;
  roleId: string;
  branchId?: string | undefined;
  roles: StaffRoleOption[];
  branches: StaffBranchOption[];
  setValue: UseFormSetValue<CreateStaffInput>;
}

export const StaffFormFields = ({
  register,
  errors,
  roleId,
  branchId,
  roles,
  branches,
  setValue,
}: CreateFieldsProps) => {
  const role = roles.find((item) => item.id === roleId);
  const branchRequired = role?.scope === "BRANCH";

  useEffect(() => {
    if (branchRequired && !branchId && branches.length === 1) {
      setValue("branchId", branches[0]!.id, { shouldValidate: true });
    }
    if (!branchRequired && branchId) setValue("branchId", undefined);
  }, [branchRequired, branchId, branches, setValue]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First name"
          required
          placeholder="John"
          error={errors.firstName?.message}
          {...register("firstName")}
        />
        <Input
          label="Last name"
          required
          placeholder="Doe"
          error={errors.lastName?.message}
          {...register("lastName")}
        />
      </div>
      <Input
        label="Email"
        required
        type="email"
        placeholder="staff@restaurant.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        required
        type="password"
        placeholder="Min. 8 characters"
        error={errors.password?.message}
        {...register("password")}
      />
      <Select
        label="Role"
        required
        options={[
          { value: "", label: "Select role" },
          ...roles
            .filter((item) => item.name !== "OWNER")
            .map((item) => ({ value: item.id, label: item.name })),
        ]}
        error={errors.roleId?.message}
        {...register("roleId")}
      />
      {branchRequired && (
        <Select
          label="Branch"
          required={branchRequired}
          options={[
            { value: "", label: "Select branch" },
            ...branches.map((item) => ({ value: item.id, label: item.name })),
          ]}
          error={errors.branchId?.message}
          value={branchId ?? ""}
          onChange={(event) =>
            setValue("branchId", event.target.value || undefined, {
              shouldValidate: true,
            })
          }
        />
      )}
    </>
  );
};
