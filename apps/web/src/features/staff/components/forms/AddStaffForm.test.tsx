import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddStaffForm } from "./AddStaffForm";

vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input {...props} />
    </label>
  ),
  Select: ({ label, options, ...props }: any) => (
    <label>
      {label}
      <select {...props}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

const roles = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "WAITER",
    scope: "BRANCH",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "MANAGER",
    scope: "TENANT",
  },
];

const branches = [{ id: "33333333-3333-4333-8333-333333333333", name: "Main" }];

describe("AddStaffForm", () => {
  it("auto-selects the only branch for branch-scoped roles", () => {
    render(
      <AddStaffForm
        roles={roles}
        branches={branches}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });

    expect((screen.getByLabelText("Branch") as HTMLSelectElement).value).toBe(
      "33333333-3333-4333-8333-333333333333",
    );
  });

  it("submits create form values through its public callback", async () => {
    const onSubmit = vi.fn();
    render(
      <AddStaffForm
        roles={roles}
        branches={branches}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.input(screen.getByLabelText("First name"), {
      target: { value: "Jane" },
    });
    fireEvent.input(screen.getByLabelText("Last name"), {
      target: { value: "Doe" },
    });
    fireEvent.input(screen.getByLabelText("Email"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.input(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });

    const form = screen
      .getByRole("button", { name: "Add Staff" })
      .closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Jane",
          lastName: "Doe",
          roleId: "11111111-1111-4111-8111-111111111111",
          branchId: "33333333-3333-4333-8333-333333333333",
        }),
      );
    });
  });
});
