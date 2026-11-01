import { useMemo, useState } from "react";
import { Button, FormErrorSummary, Input, Modal, Select } from "@pos/ui";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validateRoleForm } from "@/features/staff/helpers/role-form";

export type CreateRolePayload = {
  name: string;
  description?: string;
  scope: "TENANT" | "BRANCH";
};

type Props = {
  open: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateRolePayload,
    onError: (error: unknown) => void,
  ) => void;
};

const ROLE_SCOPE_OPTIONS = [
  { value: "BRANCH", label: "Branch — assigned to selected branches" },
  { value: "TENANT", label: "Franchise — access across the franchise" },
] as const;

export const CreateRoleModal = ({
  open,
  isSaving,
  onClose,
  onSubmit,
}: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"TENANT" | "BRANCH">("BRANCH");
  const formErrors = useLocalFormApiErrors();
  const clientErrors = useMemo(
    () => validateRoleForm({ name, description }),
    [description, name],
  );

  const reset = () => {
    formErrors.resetValidation();
    setName("");
    setDescription("");
    setScope("BRANCH");
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title="Create Role">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          formErrors.markSubmitted();
          formErrors.clearErrors();
          if (Object.keys(clientErrors).length) return;
          onSubmit(
            {
              name: name.trim(),
              ...(description.trim()
                ? { description: description.trim() }
                : {}),
              scope,
            },
            (error) =>
              formErrors.handleApiError(
                error,
                ["name", "description", "scope"],
                "Failed to create role",
              ),
          );
        }}
      >
        <FormErrorSummary messages={formErrors.formErrorMessages} />
        <Input
          label="Role name"
          value={name}
          error={formErrors.fieldError("name", clientErrors.name)}
          onBlur={() => formErrors.touchField("name")}
          onChange={(event) => {
            formErrors.clearFieldError("name");
            setName(event.target.value);
          }}
          required
          maxLength={80}
          placeholder="e.g. Shift Lead"
        />
        <Input
          label="Description"
          value={description}
          error={formErrors.fieldError("description", clientErrors.description)}
          onBlur={() => formErrors.touchField("description")}
          onChange={(event) => {
            formErrors.clearFieldError("description");
            setDescription(event.target.value);
          }}
          maxLength={500}
          placeholder="What this role is responsible for"
        />
        <Select
          label="Scope"
          value={scope}
          error={formErrors.fieldErrors.scope}
          onChange={(value) => {
            formErrors.clearFieldError("scope");
            setScope(value as "TENANT" | "BRANCH");
          }}
          options={ROLE_SCOPE_OPTIONS}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSaving}
            disabled={isSaving || Object.keys(clientErrors).length > 0}
          >
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  );
};
