import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { ChefHat } from "lucide-react";
import { z } from "zod";

import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import { Button, Card, FormErrorSummary, Input, toast } from "@pos/ui";
import { signupSchema } from "@pos/validation";

type SignupFormValues = z.infer<typeof signupSchema>;

const signupFieldPaths = [
  "firstName",
  "lastName",
  "email",
  "password",
] as const satisfies readonly (keyof SignupFormValues)[];

export const SignupPage = () => {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<SignupFormValues>();

  const handleSignup = form.handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await authService.signup(values);

      const login = await authService.login({
        email: values.email,
        password: values.password,
      });
      setAuth(login);
      toast({
        title: "Account created. Choose or create a business.",
        tone: "success",
      });
      router.navigate({ to: "/business" });
    } catch (error: unknown) {
      handleApiError(
        error,
        form.setError,
        signupFieldPaths,
        "Could not create your account",
      );
    }
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-surface via-surface to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl shadow-elevated mb-4">
            <ChefHat className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Get started</h1>
          <p className="text-sm text-text-secondary mt-1">
            Create your account
          </p>
        </div>

        <Card className="rounded-xl p-8" padding="none">
          <form onSubmit={handleSignup} className="space-y-5" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                required
                placeholder="John"
                error={form.formState.errors.firstName?.message}
                autoComplete="given-name"
                {...form.register("firstName")}
              />
              <Input
                label="Last name"
                required
                placeholder="Doe"
                error={form.formState.errors.lastName?.message}
                autoComplete="family-name"
                {...form.register("lastName")}
              />
            </div>
            <Input
              label="Email address"
              required
              type="email"
              placeholder="you@restaurant.com"
              error={form.formState.errors.email?.message}
              autoComplete="email"
              {...form.register("email")}
            />
            <Input
              label="Password"
              required
              type="password"
              placeholder="Min. 8 characters"
              error={form.formState.errors.password?.message}
              autoComplete="new-password"
              {...form.register("password")}
            />
            <FormErrorSummary messages={formErrorMessages} />
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!form.formState.isValid || isSubmitting}
              className="w-full mt-2"
            >
              {isSubmitting ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary hover:text-primary-hover font-medium"
            >
              Sign in
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
};
