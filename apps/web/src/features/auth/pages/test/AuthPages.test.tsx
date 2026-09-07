import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const setAuth = vi.fn();
  const authHook = Object.assign(vi.fn(() => ({ setAuth })), { getState: vi.fn(() => ({ user: { id: "u1" } })) });
  return { login: vi.fn(), signup: vi.fn(), memberships: vi.fn(), restore: vi.fn(), home: vi.fn(), navigate: vi.fn(), toast: vi.fn(), errorText: vi.fn(), setAuth, authHook };
});
vi.mock("@tanstack/react-router", () => ({ useRouter: () => ({ navigate: mocks.navigate }) }));
vi.mock("@/features/auth/services/auth.service", () => ({ authService: { login: mocks.login, signup: mocks.signup, memberships: mocks.memberships } }));
vi.mock("@/store/auth", () => ({ useAuthStore: mocks.authHook }));
vi.mock("@/shared/auth/active-context", () => ({ restoreActiveContext: mocks.restore }));
vi.mock("@/shared/auth/default-route", () => ({ getAuthorizedHomePath: mocks.home }));
vi.mock("@/shared/lib/api-client", () => ({ extractApiError: mocks.errorText }));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("@pos/validation", () => ({ loginSchema: {}, signupSchema: {} }));
vi.mock("lucide-react", () => ({ ChefHat: () => null, Eye: () => <span>eye</span>, EyeOff: () => <span>eyeoff</span> }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Input: React.forwardRef<HTMLInputElement, any>(({ label, suffix, error, ...props }, ref) => <label>{label}<input ref={ref} aria-label={label} {...props}/>{suffix}{error ? <span>{error}</span> : null}</label>),
  toast: mocks.toast,
}));

import { LoginPage } from "../LoginPage";
import { SignupPage } from "../SignupPage";

const loginResult = { user: { id: "u1", firstName: "Ada" }, accessToken: "a", refreshToken: "r" };

describe("auth pages coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.login.mockResolvedValue(loginResult);
    mocks.signup.mockResolvedValue({});
    mocks.memberships.mockResolvedValue([{ id: "m1" }]);
    mocks.restore.mockResolvedValue(true);
    mocks.home.mockReturnValue("/dashboard");
    mocks.errorText.mockReturnValue("Bad credentials");
  });

  it("logs in, toggles password visibility and routes to authorized home", async () => {
    render(<LoginPage />);
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    expect(password.type).toBe("password");
    fireEvent.click(screen.getByLabelText("Show password"));
    expect(password.type).toBe("text");
    fireEvent.click(screen.getByLabelText("Hide password"));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ada@example.com" } });
    fireEvent.change(password, { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith({ email: "ada@example.com", password: "password1" }));
    expect(mocks.setAuth).toHaveBeenCalledWith(loginResult);
    expect(mocks.memberships).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith({ title: "Welcome back, Ada!", tone: "success" });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });

  it("routes login without restored context to business and handles errors", async () => {
    mocks.restore.mockResolvedValueOnce(false);
    const { unmount } = render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/business" }));
    unmount();

    mocks.login.mockRejectedValueOnce(new Error("no"));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "x@y.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: "Bad credentials", tone: "danger" }));
  });

  it("signs up, logs in and handles signup failure", async () => {
    const { unmount } = render(<SignupPage />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Lovelace" } });
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.signup).toHaveBeenCalledWith({ firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", password: "password1" }));
    expect(mocks.login).toHaveBeenCalledWith({ email: "ada@example.com", password: "password1" });
    expect(mocks.setAuth).toHaveBeenCalledWith(loginResult);
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/business" });
    unmount();

    mocks.signup.mockRejectedValueOnce(new Error("bad"));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "bad@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: "Bad credentials", tone: "danger" }));
  });
});
