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

vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
    </label>
  ),
  Select: ({ label, options = [], ...props }: any) => (
    <label>
      {label}
      <select aria-label={props["aria-label"] ?? label} {...props}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));
vi.mock("@pos/api-client", () => ({
  createMenuApi: () => api,
  createCustomersApi: () => customers,
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/features/menu/hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({ data: [{ id: "cat1", name: "Food" }] }),
}));
vi.mock("@/features/menu/hooks/useMenus", () => ({
  useMenus: () => ({ data: [{ id: "menu1", name: "Dinner" }] }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries }),
  useQuery: ({ queryKey }: any) => ({
    data: queryKey[1] === "tiers" ? queryData[0] : queryData[1],
  }),
  useMutation: (config: any) => ({
    isPending: false,
    mutate: (arg?: any) => {
      Promise.resolve()
        .then(() => config.mutationFn(arg))
        .then((value) => config.onSuccess?.(value))
        .catch((error) => config.onError?.(error));
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
