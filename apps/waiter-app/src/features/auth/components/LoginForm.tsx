import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { credentialsSchema, type CredentialsForm } from "@/features/auth/types";
const inp =
  "w-full px-4 py-3.5 bg-surface-secondary border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-text-disabled";
export const LoginForm = ({
  onSubmit,
  loading,
}: {
  onSubmit: (creds: CredentialsForm) => void;
  loading: boolean;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsForm>({
    resolver: zodResolver(credentialsSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { email: "", password: "" },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label
          htmlFor="waiter-email"
          className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
        >
          Email{" "}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="waiter-email"
          type="email"
          aria-required="true"
          placeholder="you@restaurant.com"
          {...register("email")}
          className={inp}
          autoComplete="email"
        />
        {errors.email && (
          <p className="text-xs text-danger mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <label
          htmlFor="waiter-password"
          className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1.5"
        >
          Password{" "}
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        </label>
        <input
          id="waiter-password"
          type="password"
          aria-required="true"
          placeholder="••••••••"
          {...register("password")}
          className={inp}
          autoComplete="current-password"
        />
        {errors.password && (
          <p className="text-xs text-danger mt-1">{errors.password.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl text-sm disabled:opacity-60 active:scale-95 transition-transform mt-2"
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
};
