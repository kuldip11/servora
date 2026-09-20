import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  memberships: vi.fn(),
  navigate: vi.fn(),
  setAuth: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: mocks.navigate }),
}));
vi.mock("@/features/auth/services/auth.service", () => ({
  authService: {
    login: mocks.login,
    memberships: mocks.memberships,
  },
}));
vi.mock("@/store/auth", () => ({
  useAuthStore: Object.assign(() => ({ setAuth: mocks.setAuth }), {
    getState: () => ({ user: null }),
  }),
}));
vi.mock("@/shared/auth/active-context", () => ({
  restoreActiveContext: vi.fn(),
}));
vi.mock("@/shared/auth/default-route", () => ({
  getAuthorizedHomePath: vi.fn(() => "/dashboard"),
}));

import { LoginPage } from "../LoginPage";

describe("LoginPage accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("focuses and describes the first invalid field after submit", async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const email = screen.getByLabelText(/^Email address/);
    const password = screen.getByLabelText(/^Password/);

    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(password.getAttribute("aria-invalid")).toBe("true");

    const emailDescriptionId = email.getAttribute("aria-describedby");
    const passwordDescriptionId = password.getAttribute("aria-describedby");

    expect(emailDescriptionId).toBeTruthy();
    expect(passwordDescriptionId).toBeTruthy();
    expect(document.getElementById(emailDescriptionId!)).not.toBeNull();
    expect(document.getElementById(passwordDescriptionId!)).not.toBeNull();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("keeps the password visibility action keyboard-focusable", () => {
    render(<LoginPage />);

    const toggle = screen.getByRole("button", { name: "Show password" });
    toggle.focus();
    expect(document.activeElement).toBe(toggle);

    fireEvent.click(toggle);
    expect(screen.getByLabelText(/^Password/).getAttribute("type")).toBe(
      "text",
    );
    expect(screen.getByRole("button", { name: "Hide password" })).toBeTruthy();
  });
});
