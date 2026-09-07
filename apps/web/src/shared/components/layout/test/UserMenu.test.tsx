import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const authHook: any = vi.fn();
  authHook.getState = vi.fn();
  return {
    navigate: vi.fn(),
    logoutApi: vi.fn(),
    logoutStore: vi.fn(),
    clearPersisted: vi.fn(),
    clearQuery: vi.fn(),
    toast: vi.fn(),
    activate: vi.fn(),
    home: vi.fn(),
    authHook,
    state: {
      membershipId: "m1",
      memberships: [] as any[],
      user: {
        firstName: "Ada",
        lastName: "Lovelace",
        displayName: "Ada L",
        profileImageUrl: null as string | null,
      },
    },
  };
});
vi.mock("lucide-react", () => ({
  ChevronDown: () => null,
  LogOut: () => null,
  UserRound: () => null,
  Building2: () => null,
  Check: () => null,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  useRouter: () => ({ navigate: mocks.navigate }),
}));
vi.mock("@/features/auth/services/auth.service", () => ({
  authService: { logout: mocks.logoutApi },
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { clear: mocks.clearQuery },
}));
vi.mock("@/shared/auth/active-context", () => ({
  clearPersistedContext: mocks.clearPersisted,
  activateMembershipContext: mocks.activate,
}));
vi.mock("@/shared/auth/default-route", () => ({
  getAuthorizedHomePath: mocks.home,
}));
vi.mock("@/shared/utils", () => ({
  cn: (...values: any[]) => values.filter(Boolean).join(" "),
}));
vi.mock("@pos/ui", () => ({ toast: mocks.toast }));
vi.mock("@/store/auth", () => ({ useAuthStore: mocks.authHook }));

const reset = () => {
  vi.clearAllMocks();
  mocks.authHook.mockImplementation(() => ({
    ...mocks.state,
    logout: mocks.logoutStore,
  }));
  mocks.authHook.getState.mockImplementation(() => mocks.state);
  mocks.logoutApi.mockResolvedValue({});
  mocks.activate.mockResolvedValue({});
  mocks.home.mockReturnValue("/dashboard");
  mocks.state = {
    membershipId: "m1",
    memberships: [
      {
        membershipId: "m1",
        tenant: { name: "One", displayName: "Franchise One" },
        roles: [{ name: "Owner" }],
      },
      {
        membershipId: "m2",
        tenant: { name: "Two" },
        roles: [{ name: "Manager" }],
      },
    ],
    user: {
      firstName: "Ada",
      lastName: "Lovelace",
      displayName: "Ada L",
      profileImageUrl: null,
    },
  };
};

import { UserMenu } from "../UserMenu";

describe("UserMenu", () => {
  beforeEach(reset);

  it("opens/closes profile menu and signs out", async () => {
    const { container } = render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: /Ada L/ }));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Ada L/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(mocks.logoutStore).toHaveBeenCalled());
    expect(mocks.clearPersisted).toHaveBeenCalled();
    expect(mocks.clearQuery).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login" });
    expect(container.textContent).toContain("Ada L");
  });

  it("renders the profile image branch", () => {
    mocks.state.user.profileImageUrl = "/a.png";
    render(<UserMenu />);
    expect(document.querySelector("img")?.getAttribute("src")).toBe("/a.png");
  });
});
