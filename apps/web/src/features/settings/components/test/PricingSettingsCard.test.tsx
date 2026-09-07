import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenants: vi.fn(),
  update: vi.fn(),
  invalidate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@pos/api-client", () => ({
  createSettingsApi: () => ({
    tenants: mocks.tenants,
    updateTenant: mocks.update,
  }),
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: mocks.success,
  notifyError: mocks.error,
}));
vi.mock("lucide-react", () => ({ ReceiptText: () => null }));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
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
      <select aria-label={label} {...props}>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useQuery: ({ queryFn }: any) => {
    const [data, setData] = React.useState<any>();
    React.useEffect(() => {
      void queryFn()
        .then(setData)
        .catch(() => {});
    }, []);
    return { data };
  },
  useMutation: (options: any) => ({
    isPending: false,
    mutate: async () => {
      try {
        const output = await options.mutationFn();
        options.onSuccess?.(output);
      } catch (error) {
        options.onError?.(error);
      }
    },
  }),
}));

import { PricingSettingsCard } from "../PricingSettingsCard";

describe("PricingSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenants.mockResolvedValue([
      {
        tenant: {
          id: "t1",
          serviceChargePercent: 5,
          serviceChargeTaxable: true,
          roundingPolicy: "NEAREST_5",
          defaultTaxMode: "INCLUSIVE",
          courseSequencingEnabled: true,
        },
      },
    ]);
    mocks.update.mockResolvedValue({});
  });

  it("hydrates and saves pricing settings including nullable service charge", async () => {
    render(<PricingSettingsCard tenantId="t1" />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText("Service charge %") as HTMLInputElement).value,
      ).toBe("5"),
    );
    fireEvent.change(screen.getByLabelText("Service charge %"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByLabelText(/Service charge is taxable/));
    fireEvent.change(screen.getByLabelText("Rounding policy"), {
      target: { value: "NEAREST_10" },
    });
    fireEvent.change(screen.getByLabelText("Default tax mode"), {
      target: { value: "EXCLUSIVE" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save pricing settings" }),
    );

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith("t1", {
        serviceChargePercent: null,
        serviceChargeTaxable: false,
        roundingPolicy: "NEAREST_10",
        defaultTaxMode: "EXCLUSIVE",
      }),
    );
    expect(mocks.success).toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("does not save when the tenant query has no matching tenant", async () => {
    mocks.tenants.mockResolvedValueOnce([]);
    render(<PricingSettingsCard tenantId="missing" />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
