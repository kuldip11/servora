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
vi.mock("lucide-react", () => ({ ChefHat: () => null }));
vi.mock("@pos/ui", () => ({
  Card: ({ children }: any) => <section>{children}</section>,
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
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

import { KitchenOperationsSettingsCard } from "../KitchenOperationsSettingsCard";

describe("KitchenOperationsSettingsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenants.mockResolvedValue([
      {
        tenant: {
          id: "t1",
          courseSequencingEnabled: true,
        },
      },
    ]);
    mocks.update.mockResolvedValue({});
  });

  it("hydrates and saves course sequencing", async () => {
    render(<KitchenOperationsSettingsCard tenantId="t1" />);

    const checkbox = await screen.findByRole("checkbox");
    await waitFor(() =>
      expect((checkbox as HTMLInputElement).checked).toBe(true),
    );
    fireEvent.click(checkbox);
    fireEvent.click(
      screen.getByRole("button", { name: "Save kitchen settings" }),
    );

    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith("t1", {
        courseSequencingEnabled: false,
      }),
    );
    expect(mocks.success).toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("reports mutation errors", async () => {
    mocks.update.mockRejectedValueOnce(new Error("no"));
    render(<KitchenOperationsSettingsCard tenantId="t1" />);

    await screen.findByRole("checkbox");
    fireEvent.click(
      screen.getByRole("button", { name: "Save kitchen settings" }),
    );

    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  });
});
