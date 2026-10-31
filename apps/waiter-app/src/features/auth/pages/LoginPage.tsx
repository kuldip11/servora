import { ChefHat } from "lucide-react";
import { useLogin } from "@/features/auth/hooks/useLogin";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { BranchSelector } from "@/features/auth/components/BranchSelector";
import { MembershipSelector } from "@/features/auth/components/MembershipSelector";

export interface Props {
  onLogin: () => void;
}
export const LoginPage = ({ onLogin }: Props) => {
  const auth = useLogin(onLogin);
  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <div className="flex-1 flex items-center justify-center pt-12 pb-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 bg-primary-foreground/20">
            <ChefHat className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">
            Waiter App
          </h1>
          <p className="text-primary-foreground/75 mt-1 text-sm">
            {auth.step === "credentials"
              ? "Sign in to start taking orders"
              : auth.step === "membership"
                ? "Choose your business"
                : "Select your branch"}
          </p>
        </div>
      </div>
      <div className="rounded-t-3xl bg-surface px-6 pb-10 pt-8 shadow-2xl">
        <div className="mx-auto w-full max-w-md">
          {auth.step === "credentials" ? (
            <LoginForm
              onSubmit={auth.submitCredentials}
              loading={auth.isLoading}
            />
          ) : auth.step === "membership" ? (
            <MembershipSelector
              memberships={auth.memberships}
              onSelect={auth.selectMembership}
            />
          ) : (
            <BranchSelector
              branches={auth.branches}
              onSelect={auth.selectBranchForMembership}
              onBack={auth.resetToCredentials}
            />
          )}
        </div>
      </div>
    </div>
  );
};
