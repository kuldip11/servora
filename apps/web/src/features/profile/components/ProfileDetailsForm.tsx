import { useForm, useFormState } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormErrorSummary, Input } from "@pos/ui";
import type { User } from "@pos/types";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/profile/schemas/profile-form.schema";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const profileFieldPaths = [
  "firstName",
  "lastName",
  "displayName",
  "phone",
  "profileImageUrl",
] as const satisfies readonly (keyof ProfileFormValues)[];

export const ProfileDetailsForm = ({ user }: { user: User | null }) => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      displayName: user?.displayName ?? "",
      phone: user?.phone ?? "",
      profileImageUrl: user?.profileImageUrl ?? "",
    },
    mode: "onChange",
  });
  const { errors, isDirty, isSubmitting, isValid } = useFormState({
    control: form.control,
  });
  const mutation = useUpdateProfile();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<ProfileFormValues>();

  const submit = form.handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await mutation.mutateAsync(values);
      form.reset(values);
    } catch (error) {
      handleApiError(
        error,
        form.setError,
        profileFieldPaths,
        "Could not update profile",
      );
    }
  });

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="First name"
          error={errors.firstName?.message}
          {...form.register("firstName")}
        />
        <Input
          label="Last name"
          error={errors.lastName?.message}
          {...form.register("lastName")}
        />
      </div>
      <Input
        label="Display name (optional)"
        error={errors.displayName?.message}
        {...form.register("displayName")}
      />
      <Input label="Email" value={user?.email ?? ""} disabled />
      <Input
        label="Phone (optional)"
        error={errors.phone?.message}
        {...form.register("phone")}
      />
      <Input
        label="Profile image URL (optional)"
        type="url"
        error={errors.profileImageUrl?.message}
        {...form.register("profileImageUrl")}
      />
      <FormErrorSummary messages={formErrorMessages} />
      <Button
        type="submit"
        loading={mutation.isPending}
        disabled={!isValid || !isDirty || mutation.isPending || isSubmitting}
      >
        {mutation.isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
};
