import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { ChefHat, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { Button, Card, Input, toast } from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import { loginSchema } from "@pos/validation";
import { restoreActiveContext } from "@/shared/auth/active-context";
import { getAuthorizedHomePath } from "@/shared/auth/default-route";

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleLogin(form: LoginFormValues) {
    setLoading(true);
    try {
      const result = await authService.login(form);
      setAuth(result);
      const memberships = await authService.memberships();
      const restored = await restoreActiveContext(memberships);
      toast({
        title: `Welcome back, ${result.user.firstName}!`,
        tone: "success",
      });
      router.navigate({
        to: restored
          ? getAuthorizedHomePath(useAuthStore.getState().user)
          : "/business",
      });
    } catch (err: unknown) {
      const msg = extractApiError(err);
      toast({ title: msg, tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-surface via-surface to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl shadow-elevated mb-4">
            <ChefHat className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-secondary mt-1">
            Sign in to your restaurant POS
          </p>
        </div>

        <Card className="rounded-xl p-8" padding="none">
          <form
            onSubmit={handleSubmit(handleLogin)}
            className="space-y-5"
            noValidate
          >
            <Input
              label="Email address"
              type="email"
              placeholder="you@restaurant.com"
              error={errors.email?.message}
              autoComplete="email"
              {...register("email")}
            />

            <Input
              id="login-password"
              label="Password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="text-text-disabled hover:text-text-secondary"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
              {...register("password")}
            />

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            New restaurant?{" "}
            <a
              href="/signup"
              className="text-primary hover:text-primary-hover font-medium"
            >
              Create an account
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
};
