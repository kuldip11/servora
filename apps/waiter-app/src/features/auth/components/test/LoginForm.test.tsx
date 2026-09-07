import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("@pos/ui", () => ({ toast }));

import { LoginForm } from "@/features/auth/components/LoginForm";

describe("LoginForm", () => {
  it("validates login and submits valid credentials", async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} loading={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() =>
      expect(
        screen.getAllByText(/required|email|password/i).length,
      ).toBeGreaterThan(0),
    );
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("renders the loading label", () => {
    render(<LoginForm onSubmit={vi.fn()} loading />);
    expect(screen.getByRole("button", { name: /Signing in/ })).toBeTruthy();
  });
});
