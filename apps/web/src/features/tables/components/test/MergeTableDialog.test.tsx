import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mergeMutate: vi.fn(), mergePending: false }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({
    mutate: mocks.mergeMutate,
    isPending: mocks.mergePending,
  }),
}));
vi.mock("@/features/orders/services/orders.service", () => ({
  ordersService: { mergeOrders: vi.fn() },
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("@/shared/lib/notify", () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

import { MergeTableDialog } from "../TableOperationsDialogs";
const table = (id: string, status = "AVAILABLE") =>
  ({ id, name: `Table ${id}`, status, branchId: "b1" }) as any;
const order = (id: string, tableId: string) => ({ id, tableId }) as any;

describe("MergeTableDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("owns merge target selection", () => {
    render(
      <MergeTableDialog
        source={table("1", "OCCUPIED")}
        tables={[table("1", "OCCUPIED"), table("2", "OCCUPIED")]}
        openOrders={[order("o1", "1"), order("o2", "2")]}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "o2" } });
    fireEvent.click(screen.getByRole("button", { name: "Merge tables" }));
    expect(mocks.mergeMutate).toHaveBeenCalledWith({
      sourceOrderId: "o1",
      targetOrderId: "o2",
    });
  });
});
