import { useForm, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormErrorSummary, Input } from "@pos/ui";
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from "@/features/profile/schemas/profile-form.schema";
import { useChangePassword } from "@/features/profile/hooks/useChangePassword";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const passwordFieldPaths = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
] as const satisfies readonly (keyof ChangePasswordFormValues)[];

export const ChangePasswordForm = () => {
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });
  const { errors, isSubmitting, isValid } = useFormState({
    control: form.control,
  });
  const mutation = useChangePassword();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<ChangePasswordFormValues>();

  const submit = form.handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      form.reset();
    } catch (error) {
      handleApiError(
        error,
        form.setError,
        passwordFieldPaths,
        "Could not change password",
      );
    }
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register("currentPassword")}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...form.register("newPassword")}
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <FormErrorSummary messages={formErrorMessages} />
      <Button
        type="submit"
        loading={mutation.isPending}
        disabled={!isValid || mutation.isPending || isSubmitting}
      >
        {mutation.isPending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
};
