import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const updateProfile = vi.fn();
  const changePassword = vi.fn();
  const setContext = vi.fn();
  const notifySuccess = vi.fn();
  const notifyError = vi.fn();
  const user = {
    id: "u1",
    firstName: "Ada",
    lastName: "Lovelace",
    displayName: "Ada",
    email: "ada@example.com",
    phone: "1",
    profileImageUrl: "https://x.test/a.png",
  };
  const authState = {
    user,
    setContext,
    membershipId: "m1",
    franchiseId: "f1",
    branchId: "b1",
  };
  const authHook = Object.assign(
    vi.fn((selector?: (state: typeof authState) => unknown) =>
      selector ? selector(authState) : authState,
    ),
    {
      getState: vi.fn(() => authState),
    },
  );
  return {
    updateProfile,
    changePassword,
    setContext,
    notifySuccess,
    notifyError,
    user,
    authHook,
  };
});

vi.mock("@/store/auth", () => ({ useAuthStore: mocks.authHook }));
vi.mock("@/features/auth/services/auth.service", () => ({
  authService: {
    updateProfile: mocks.updateProfile,
    changePassword: mocks.changePassword,
  },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: mocks.notifySuccess,
  notifyError: mocks.notifyError,
}));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: (options: any) => ({
      isPending: false,
      mutateAsync: async (variables: any) => {
        const value = await options.mutationFn(variables);
        options.onSuccess?.(value);
        return value;
      },
    }),
  };
});
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: React.PropsWithChildren) => (
    <section>{children}</section>
  ),
  Input: React.forwardRef<HTMLInputElement, any>(
    ({ label, error, ...props }, ref) => (
      <label>
        {label}
        <input ref={ref} aria-label={label} {...props} />
        {error ? <span>{error}</span> : null}
      </label>
    ),
  ),
  FormErrorSummary: ({ messages }: { messages: string[] }) =>
    messages.length ? <div role="alert">{messages.join(" ")}</div> : null,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

import { ProfilePage } from "../ProfilePage";

describe("ProfilePage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateProfile.mockResolvedValue({
      ...mocks.user,
      firstName: "Grace",
    });
    mocks.changePassword.mockResolvedValue(undefined);
  });

  it("updates profile and reports mutation errors", async () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Grace" },
    });
    const saveButton = screen.getByRole("button", { name: "Save profile" });
    await waitFor(() =>
      expect((saveButton as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(saveButton);
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalled());
    expect(mocks.setContext).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: "m1",
        franchiseId: "f1",
        branchId: "b1",
      }),
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith("Profile updated");

    mocks.updateProfile.mockRejectedValueOnce(new Error("bad"));
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Katherine" },
    });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Save profile",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect((await screen.findByRole("alert")).textContent).toContain("bad");
  });

  it("validates and changes password including error path", async () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "new-pass-1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "different" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("Passwords do not match")).toBeTruthy();
    expect(mocks.changePassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "new-pass-1" },
    });
    const changeButton = screen.getByRole("button", {
      name: "Change password",
    });
    await waitFor(() =>
      expect((changeButton as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(changeButton);
    await waitFor(() =>
      expect(mocks.changePassword).toHaveBeenCalledWith({
        currentPassword: "old-pass",
        newPassword: "new-pass-1",
      }),
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith("Password changed");

    mocks.changePassword.mockRejectedValueOnce(new Error("wrong"));
    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "bad-pass" },
    });
    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "another1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "another1" },
    });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Change password",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect((await screen.findByRole("alert")).textContent).toContain("wrong");
  });

  it("disables submit until client validation passes", async () => {
    render(<ProfilePage />);

    const saveButton = screen.getByRole("button", { name: "Save profile" });
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    const firstName = screen.getByLabelText("First name");
    fireEvent.change(firstName, { target: { value: "" } });
    expect(screen.queryByText("First name is required")).toBeNull();
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.blur(firstName);
    expect(await screen.findByText("First name is required")).toBeTruthy();

    const passwordButton = screen.getByRole("button", {
      name: "Change password",
    });
    expect((passwordButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(screen.getByLabelText("Current password"), {
      target: { value: "old-pass" },
    });
    const newPassword = screen.getByLabelText("New password");
    fireEvent.change(newPassword, { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), {
      target: { value: "short" },
    });
    expect(screen.queryByText("Use at least 8 characters")).toBeNull();
    fireEvent.blur(newPassword);
    expect(await screen.findByText("Use at least 8 characters")).toBeTruthy();
    expect((passwordButton as HTMLButtonElement).disabled).toBe(false);
  });
});
