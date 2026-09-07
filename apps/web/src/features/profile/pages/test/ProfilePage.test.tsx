import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const updateProfile = vi.fn();
  const changePassword = vi.fn();
  const setContext = vi.fn();
  const notifySuccess = vi.fn();
  const notifyError = vi.fn();
  const user = { id: "u1", firstName: "Ada", lastName: "Lovelace", displayName: "Ada", email: "ada@example.com", phone: "1", profileImageUrl: "https://x.test/a.png" };
  const authHook = Object.assign(
    vi.fn(() => ({ user, setContext })),
    { getState: vi.fn(() => ({ membershipId: "m1", franchiseId: "f1", branchId: "b1" })) },
  );
  return { updateProfile, changePassword, setContext, notifySuccess, notifyError, user, authHook };
});

vi.mock("@/store/auth", () => ({ useAuthStore: mocks.authHook }));
vi.mock("@/features/auth/services/auth.service", () => ({
  authService: { updateProfile: mocks.updateProfile, changePassword: mocks.changePassword },
}));
vi.mock("@/shared/lib/notify", () => ({ notifySuccess: mocks.notifySuccess, notifyError: mocks.notifyError }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => ({
    isPending: false,
    mutate: async (variables: any) => {
      try {
        const value = await options.mutationFn(variables);
        options.onSuccess?.(value);
      } catch (error) {
        options.onError?.(error);
      }
    },
  }),
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Input: React.forwardRef<HTMLInputElement, any>(({ label, error, ...props }, ref) => <label>{label}<input ref={ref} aria-label={label} {...props}/>{error ? <span>{error}</span> : null}</label>),
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => <header><h1>{title}</h1><p>{description}</p></header>,
}));

import { ProfilePage } from "../ProfilePage";

describe("ProfilePage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateProfile.mockResolvedValue({ ...mocks.user, firstName: "Grace" });
    mocks.changePassword.mockResolvedValue(undefined);
  });

  it("updates profile and reports mutation errors", async () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Grace" } });
    fireEvent.click(screen.getByText("Save profile"));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalled());
    expect(mocks.setContext).toHaveBeenCalledWith(expect.objectContaining({ membershipId: "m1", franchiseId: "f1", branchId: "b1" }));
    expect(mocks.notifySuccess).toHaveBeenCalledWith("Profile updated");

    mocks.updateProfile.mockRejectedValueOnce(new Error("bad"));
    fireEvent.click(screen.getByText("Save profile"));
    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith(expect.any(Error), "Could not update profile"));
  });

  it("validates and changes password including error path", async () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-pass-1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Passwords do not match")).toBeTruthy();
    expect(mocks.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-pass-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(mocks.changePassword).toHaveBeenCalledWith({ currentPassword: "old-pass", newPassword: "new-pass-1" }));
    expect(mocks.notifySuccess).toHaveBeenCalledWith("Password changed");

    mocks.changePassword.mockRejectedValueOnce(new Error("wrong"));
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "bad-pass" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "another1" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "another1" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith(expect.any(Error), "Could not change password"));
  });

  it("shows required and minimum-length validation", async () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Save profile"));
    expect(await screen.findByText("First name is required")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Current password is required")).toBeTruthy();
    expect(screen.getByText("Use at least 8 characters")).toBeTruthy();
    expect(screen.getByText("Confirm the password")).toBeTruthy();
  });
});
