import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BranchSelector } from "@/features/auth/components/BranchSelector";

describe("BranchSelector", () => {
  it("selects a branch, confirms and goes back", () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    render(
      <BranchSelector
        branches={[{ id: "b", name: "Main", address: "Addr" } as any]}
        onSelect={onSelect}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Main/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start Shift" }));
    expect(onSelect).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
