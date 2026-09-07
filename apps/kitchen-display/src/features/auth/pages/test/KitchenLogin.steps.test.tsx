import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
}));

vi.mock("../../hooks/useLogin", () => ({ useLogin: () => mocks.auth }));
vi.mock("../../components/LoginForm", () => ({
  LoginForm: () => <div>credentials-form</div>,
}));
vi.mock("../../components/MembershipSelector", () => ({
  MembershipSelector: () => <div>membership-selector</div>,
}));
vi.mock("../../components/BranchSelector", () => ({
  BranchSelector: () => <div>branch-selector</div>,
}));

import { KitchenLogin } from "../KitchenLogin";

const base = {
  memberships: [],
  branches: [],
  submitCredentials: vi.fn(),
  selectMembership: vi.fn(),
  selectBranchForMembership: vi.fn(),
  isLoading: false,
  resetToCredentials: vi.fn(),
};

describe("KitchenLogin steps", () => {
  it.each([
    ["credentials", "Sign in to continue", "credentials-form"],
    ["membership", "Choose your business", "membership-selector"],
    ["branch", "Select the kitchen branch", "branch-selector"],
  ])("renders the %s step", (step, message, content) => {
    mocks.auth = { ...base, step };
    const html = renderToStaticMarkup(<KitchenLogin onLogin={vi.fn()} />);
    expect(html).toContain(message);
    expect(html).toContain(content);
  });
});
