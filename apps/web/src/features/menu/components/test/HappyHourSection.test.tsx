import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { invalidateQueries, api, customers } = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  api: {
    createLoyaltyTier: vi.fn(),
    removeLoyaltyTier: vi.fn(),
    listLoyaltyTiers: vi.fn(),
    createHappyHourRule: vi.fn(),
  },
  customers: { list: vi.fn(), create: vi.fn(), assignTier: vi.fn() },
}));
let queryData: unknown[] = [];

vi.mock("@pos/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/api-client")>()),
  extractApiError: (error: any) =>
    error?.response?.data?.error?.message ?? "Request failed",
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
    </label>
  ),
  Select: ({
    label,
    options = [],
    onChange,
    containerClassName: _containerClassName,
    ...props
  }: any) => (
    <label>
      {label}
      <select
        aria-label={props["aria-label"] ?? label}
        {...props}
        onChange={(event) => onChange?.(event.target.value)}
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));
vi.mock("@/features/menu", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/menu")>()),
  useMenuCategories: () => ({ data: [{ id: "cat1", name: "Food" }] }),
}));
vi.mock("@/features/menu/hooks/useMenus", () => ({
  useMenus: () => ({ data: [{ id: "menu1", name: "Dinner" }] }),
}));
vi.mock("@/features/menu/hooks/useCreateHappyHourRule", () => ({
  useCreateHappyHourRule: () => ({
    isPending: false,
    mutate: (
      input: Record<string, unknown>,
      options?: {
        onSuccess?: (rows: unknown[]) => void;
        onError?: (error: unknown) => void;
      },
    ) => {
      Promise.resolve(api.createHappyHourRule(input))
        .then((rows) => options?.onSuccess?.(rows))
        .catch((error) => options?.onError?.(error));
    },
  }),
}));

import { HappyHourSection } from "../HappyHourSection";

describe("HappyHourSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryData = [[], []];
    api.createHappyHourRule.mockResolvedValue([{}, {}]);
  });

  it("creates category and menu happy-hour rules", async () => {
    const { unmount } = render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat1" },
    });
    fireEvent.change(screen.getByLabelText("Start date (optional)"), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText("End date (optional)"), {
      target: { value: "2026-09-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create happy hour" }));
    await waitFor(() =>
      expect(screen.getByText("Created 2 price rules.")).toBeTruthy(),
    );
    expect(api.createHappyHourRule.mock.calls[0][0]).toMatchObject({
      categoryId: "cat1",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    unmount();

    api.createHappyHourRule.mockResolvedValueOnce([{}]);
    render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText("Scope"), {
      target: { value: "MENU" },
    });
    fireEvent.change(screen.getByLabelText("Menu"), {
      target: { value: "menu1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create happy hour" }));
    await waitFor(() =>
      expect(screen.getByText("Created 1 price rule.")).toBeTruthy(),
    );
  });

  it("renders API and fallback errors", async () => {
    api.createHappyHourRule.mockRejectedValueOnce({
      response: { data: { error: { message: "Bad range" } } },
    });
    const { unmount } = render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create happy hour" }));
    await waitFor(() => expect(screen.getByText("Bad range")).toBeTruthy());
    unmount();

    api.createHappyHourRule.mockRejectedValueOnce(new Error("x"));
    render(<HappyHourSection />);
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create happy hour" }));
    await waitFor(() =>
      expect(
        screen.getByText("Could not create happy-hour rules"),
      ).toBeTruthy(),
    );
  });
});
