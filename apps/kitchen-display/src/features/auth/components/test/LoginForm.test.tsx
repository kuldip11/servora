import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  errors: {} as Record<string, { message: string } | undefined>,
  register: vi.fn((name: string) => ({ name })),
  handleSubmit: vi.fn((onSubmit: (value: unknown) => void) => onSubmit),
}));

vi.mock("react-hook-form", () => ({
  useForm: () => ({
    register: mocks.register,
    handleSubmit: mocks.handleSubmit,
    formState: { errors: mocks.errors },
  }),
}));
vi.mock("@hookform/resolvers/zod", () => ({
  zodResolver: vi.fn(() => vi.fn()),
}));
vi.mock("@pos/ui", () => ({
  TextInput: (props: { label: string; error?: string }) => (
    <div>{`${props.label}:${props.error ?? "ok"}`}</div>
  ),
  PasswordInput: (props: { label: string; error?: string }) => (
    <div>{`${props.label}:${props.error ?? "ok"}`}</div>
  ),
  Button: ({
    children,
    disabled,
  }: {
    children: unknown;
    disabled?: boolean;
  }) => <button disabled={disabled}>{children as never}</button>,
}));

import { LoginForm } from "../LoginForm";

describe("LoginForm coverage", () => {
  it("renders idle fields without validation errors", () => {
    mocks.errors = {};
    const html = renderToStaticMarkup(
      <LoginForm onSubmit={vi.fn()} loading={false} />,
    );
    expect(html).toContain("Email:ok");
    expect(html).toContain("Password:ok");
    expect(html).toContain("Continue");
  });

  it("renders validation errors and pending state", () => {
    mocks.errors = {
      email: { message: "Invalid email" },
      password: { message: "Required" },
    };
    const html = renderToStaticMarkup(
      <LoginForm onSubmit={vi.fn()} loading={true} />,
    );
    expect(html).toContain("Email:Invalid email");
    expect(html).toContain("Password:Required");
    expect(html).toContain("Signing in");
    expect(html).toContain("disabled");
  });
});
