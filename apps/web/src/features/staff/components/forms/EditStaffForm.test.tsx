import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditStaffForm } from "./EditStaffForm";

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

describe("EditStaffForm", () => {
  it("submits branch assignments through its public callback", async () => {
    const onSubmit = vi.fn();
    render(
      <EditStaffForm
        member={{
          id: "m1",
          firstName: "John",
          lastName: "Doe",
          roles: [{ name: "WAITER" }],
          assignedBranches: [{ id: "33333333-3333-4333-8333-333333333333" }],
        }}
        roles={roles}
        branches={branches}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const form = screen
      .getByRole("button", { name: "Save changes" })
      .closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        roleId: "11111111-1111-4111-8111-111111111111",
        branchIds: ["33333333-3333-4333-8333-333333333333"],
      });
    });
  });
});
