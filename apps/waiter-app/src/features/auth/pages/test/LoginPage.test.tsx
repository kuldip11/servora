import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { useLogin } = vi.hoisted(() => ({ useLogin: vi.fn() }));
vi.mock("../../hooks/useLogin", () => ({ useLogin }));
import { LoginPage } from "@/features/auth/pages/LoginPage";

const state = (step: "credentials"|"membership"|"branch") => ({
  step,
  memberships: step === "membership" ? [{membershipId:"m",tenant:{id:"t",name:"Tenant"},roles:[],branches:[]}] : [],
  branches: step === "branch" ? [{id:"b",name:"Main",address:"Addr"}] : [],
  submitCredentials: vi.fn(), selectMembership: vi.fn(), selectBranchForMembership: vi.fn(),
  isLoading: false, resetToCredentials: vi.fn(),
});
beforeEach(()=>useLogin.mockReset());
describe("LoginPage", () => {
  it.each([
    ["credentials","Sign in to start taking orders"],
    ["membership","Choose your business"],
    ["branch","Select your branch"],
  ] as const)("renders %s step", (step,copy) => {
    useLogin.mockReturnValue(state(step));
    render(<LoginPage onLogin={vi.fn()} />);
    expect(screen.getAllByText(copy).length).toBeGreaterThan(0);
  });
});
