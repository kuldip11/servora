import { Card, Page, PageHeader } from "@pos/ui";
import { useAuthStore } from "@/store/auth";
import { ProfileDetailsForm } from "@/features/profile/components/ProfileDetailsForm";
import { ChangePasswordForm } from "@/features/profile/components/ChangePasswordForm";

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <Page>
      <PageHeader
        title="My profile"
        description="Manage your personal details and sign-in password."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold">Personal details</h2>
          <ProfileDetailsForm user={user} />
        </Card>
        <Card>
          <h2 className="mb-4 text-base font-semibold">Change password</h2>
          <ChangePasswordForm />
        </Card>
      </div>
    </Page>
  );
};
