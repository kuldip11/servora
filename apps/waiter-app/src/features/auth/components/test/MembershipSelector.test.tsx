import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MembershipSelector } from "@/features/auth/components/MembershipSelector";

describe("MembershipSelector", () => {
  it("selects a membership", () => {
    const onSelect = vi.fn();
    render(
      <MembershipSelector
        memberships={[
          {
            membershipId: "m",
            tenant: { id: "t", name: "Tenant" },
            roles: [{ name: "Waiter" }],
            branches: [],
          } as any,
        ]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Tenant/ }));
    expect(onSelect).toHaveBeenCalledWith("m");
  });
});
