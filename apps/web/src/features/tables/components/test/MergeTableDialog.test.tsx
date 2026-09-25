import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";

const mocks = vi.hoisted(() => ({ mergeMutate: vi.fn(), mergePending: false }));
vi.mock("@/features/orders", () => ({
  useTransferTable: () => ({ mutate: vi.fn(), isPending: false }),
  useMergeOrders: () => ({
    mutate: mocks.mergeMutate,
    isPending: mocks.mergePending,
  }),
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
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
    chooseSelectOption("Merge billing into", "Table 2");
    fireEvent.click(screen.getByRole("button", { name: "Merge tables" }));
    expect(mocks.mergeMutate).toHaveBeenCalledWith(
      {
        sourceOrderId: "o1",
        targetOrderId: "o2",
      },
      expect.any(Object),
    );
  });
});
