import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const setAuth = vi.fn();
  const authState = { setAuth, user: { id: "u1" } };
  const authHook = Object.assign(
    vi.fn((selector?: (state: typeof authState) => unknown) =>
      selector ? selector(authState) : authState,
    ),
    { getState: vi.fn(() => authState) },
  );
  return {
    login: vi.fn(),
    signup: vi.fn(),
    memberships: vi.fn(),
    restore: vi.fn(),
    home: vi.fn(),
    navigate: vi.fn(),
    toast: vi.fn(),
    errorText: vi.fn(),
    setAuth,
    authHook,
  };
});
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mocks.navigate }),
}));
vi.mock("@/features/auth/services/auth.service", () => ({
  authService: {
    login: mocks.login,
    signup: mocks.signup,
    memberships: mocks.memberships,
  },
}));
vi.mock("@/store/auth", () => ({ useAuthStore: mocks.authHook }));
vi.mock("@/shared/auth/active-context", () => ({
  restoreActiveContext: mocks.restore,
}));
vi.mock("@/shared/auth/default-route", () => ({
  getAuthorizedHomePath: mocks.home,
}));
vi.mock("@/shared/lib/api-client", () => ({
  extractApiError: mocks.errorText,
}));
vi.mock("lucide-react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lucide-react")>()),
  ChefHat: () => null,
  Eye: () => <span>eye</span>,
  EyeOff: () => <span>eyeoff</span>,
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: React.PropsWithChildren) => (
    <section>{children}</section>
  ),
  Input: React.forwardRef<HTMLInputElement, any>(
    ({ label, suffix, error, ...props }, ref) => (
      <label>
        {label}
        <input ref={ref} aria-label={label} {...props} />
        {suffix}
        {error ? <span>{error}</span> : null}
      </label>
    ),
  ),
  FormErrorSummary: ({ messages }: { messages: string[] }) =>
    messages.length ? <div role="alert">{messages.join(" ")}</div> : null,
  toast: mocks.toast,
}));

const loginResult = {
  user: { id: "u1", firstName: "Ada" },
  accessToken: "a",
  refreshToken: "r",
};
const resetAuthMocks = () => {
  vi.clearAllMocks();
  mocks.login.mockResolvedValue(loginResult);
  mocks.signup.mockResolvedValue({});
  mocks.memberships.mockResolvedValue([{ id: "m1" }]);
  mocks.restore.mockResolvedValue(true);
  mocks.home.mockReturnValue("/dashboard");
  mocks.errorText.mockReturnValue("Bad credentials");
};

import { SignupPage } from "../SignupPage";

describe("SignupPage", () => {
  beforeEach(resetAuthMocks);

  it("signs up, logs in and handles signup failure", async () => {
    const { unmount } = render(<SignupPage />);
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password1" },
    });
    const createButton = screen.getByRole("button", { name: "Create account" });
    await waitFor(() =>
      expect((createButton as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(createButton);
    await waitFor(() =>
      expect(mocks.signup).toHaveBeenCalledWith({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        password: "password1",
      }),
    );
    expect(mocks.login).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "password1",
    });
    expect(mocks.setAuth).toHaveBeenCalledWith(loginResult);
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/business" });
    unmount();

    mocks.signup.mockRejectedValueOnce(new Error("bad"));
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password1" },
    });
    const submit = screen.getByRole("button", { name: "Create account" });
    await waitFor(() =>
      expect((submit as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(submit);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Bad credentials",
    );
  });
});
