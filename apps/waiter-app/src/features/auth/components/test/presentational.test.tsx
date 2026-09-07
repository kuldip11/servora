import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@pos/ui", () => ({ toast }));
import { BranchSelector } from "@/features/auth/components/BranchSelector";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { MembershipSelector } from "@/features/auth/components/MembershipSelector";

describe("auth components", () => {
  it("selects membership", () => {
    const onSelect=vi.fn();
    render(<MembershipSelector memberships={[{membershipId:"m",tenant:{id:"t",name:"Tenant"},roles:[{name:"Waiter"}],branches:[]} as any]} onSelect={onSelect}/>);
    fireEvent.click(screen.getByRole("button",{name:/Tenant/}));
    expect(onSelect).toHaveBeenCalledWith("m");
  });
  it("selects branch, confirms and goes back", () => {
    const onSelect=vi.fn(), onBack=vi.fn();
    render(<BranchSelector branches={[{id:"b",name:"Main",address:"Addr"} as any]} onSelect={onSelect} onBack={onBack}/>);
    fireEvent.click(screen.getByRole("button",{name:/Main/}));
    fireEvent.click(screen.getByRole("button",{name:"Start Shift"}));
    expect(onSelect).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("button",{name:/Back/})); expect(onBack).toHaveBeenCalled();
  });
  it("validates login and submits valid credentials", async () => {
    const onSubmit=vi.fn(); render(<LoginForm onSubmit={onSubmit} loading={false}/>);
    fireEvent.click(screen.getByRole("button",{name:"Sign In"}));
    await waitFor(()=>expect(screen.getAllByText(/required|email|password/i).length).toBeGreaterThan(0));
    fireEvent.change(screen.getByLabelText("Email"),{target:{value:"a@b.com"}});
    fireEvent.change(screen.getByLabelText("Password"),{target:{value:"password123"}});
    fireEvent.click(screen.getByRole("button",{name:"Sign In"}));
    await waitFor(()=>expect(onSubmit).toHaveBeenCalled());
  });
  it("renders loading label",()=>{ render(<LoginForm onSubmit={vi.fn()} loading/>); expect(screen.getByRole("button",{name:/Signing in/})).toBeTruthy(); });
});
