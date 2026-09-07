import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/lib/api-client";
import {
  addOrderItems,
  fetchOrder,
  fetchOrders,
  updateOrderStatus,
  updateTicketStatus,
  fetchCancellationReasons,
  refireOrderItem,
  refillOrderItem,
  setOrderItemSeatShares,
  voidOrderItem,
  compOrderItem,
  transferOrderTable,
  splitOrderBill,
  splitOrderBillByItems,
  splitOrderBillBySeat,
  mergeOrders,
} from "@/features/orders/api/orders";

vi.mock("../../../../shared/lib/api-client", () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe("orders API", () => {
  it("fetches list and detail endpoints", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "o1" }],
          pagination: { page: 1, limit: 25, total: 1, hasMore: false },
        },
      } as any)
      .mockResolvedValueOnce({ data: { data: { id: "o1" } } } as any);
    await expect(fetchOrders()).resolves.toEqual({
      items: [{ id: "o1" }],
      pagination: { page: 1, limit: 25, total: 1, hasMore: false },
    });
    await expect(fetchOrder("o1")).resolves.toEqual({ id: "o1" });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/orders", {
      params: { page: "1", limit: "25" },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/orders/o1");
  });

  it("validates mutation payloads before calling the API", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      data: { data: { id: "o1", status: "PAID" } },
    } as any);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { id: "o1" } },
    } as any);
    await updateOrderStatus("o1", "PAID");
    expect(apiClient.patch).toHaveBeenCalledWith("/orders/o1/status", {
      status: "PAID",
    });
    await updateTicketStatus("t1", "READY");
    expect(apiClient.patch).toHaveBeenCalledWith("/kitchen-tickets/t1/status", {
      status: "READY",
    });
    await addOrderItems(
      "o1",
      [{ menuItemId: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 }],
      [],
      "no onions",
    );
    expect(apiClient.post).toHaveBeenCalledWith("/orders/o1/items", {
      items: [
        { menuItemId: "550e8400-e29b-41d4-a716-446655440000", quantity: 2 },
      ],
      notes: "no onions",
    });
    await expect(updateOrderStatus("o1", "INVALID")).rejects.toThrow();
  });

  it("covers the remaining order and billing operations", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { data: [{ id: "r1", label: "Guest request" }] },
    } as any);
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { data: { id: "o1", status: "OPEN" } },
    } as any);
    vi.mocked(apiClient.put).mockResolvedValue({ data: { data: null } } as any);

    await expect(fetchCancellationReasons()).resolves.toEqual([
      { id: "r1", label: "Guest request" },
    ]);
    await expect(refireOrderItem("o1", "i1", "Cold")).resolves.toMatchObject({ id: "o1" });
    await expect(refireOrderItem("o1", "i1", "Cold", false)).resolves.toMatchObject({ id: "o1" });
    await expect(refillOrderItem("o1", "i1")).resolves.toMatchObject({ id: "o1" });
    await setOrderItemSeatShares("o1", "i1", [
      { seatLabel: "S1", shareRatio: 0.5 },
      { seatLabel: "S2", shareRatio: 0.5 },
    ]);
    await expect(
      voidOrderItem("o1", "i1", { reason: "Mistake", approvalToken: "a" }),
    ).resolves.toMatchObject({ id: "o1" });
    await expect(
      compOrderItem("o1", "i1", { cancellationReasonId: "r1" }),
    ).resolves.toMatchObject({ id: "o1" });
    await expect(transferOrderTable("o1", "t2", " move ")).resolves.toMatchObject({ id: "o1" });
    await expect(transferOrderTable("o1", "t2", "   ")).resolves.toMatchObject({ id: "o1" });
    await splitOrderBill("o1", 2);
    await splitOrderBillByItems("o1", [
      { label: "A", orderItemIds: ["i1"] },
    ]);
    await expect(splitOrderBillBySeat("o1", "EVEN_SPLIT")).resolves.toMatchObject({ id: "o1" });
    await mergeOrders("o1", "o2");

    expect(apiClient.put).toHaveBeenCalledWith(
      "/orders/o1/items/i1/seat-shares",
      { shares: [{ seatLabel: "S1", shareRatio: 0.5 }, { seatLabel: "S2", shareRatio: 0.5 }] },
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders/o1/transfer-table",
      { newTableId: "t2", reason: "move" },
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/orders/o1/transfer-table",
      { newTableId: "t2" },
    );
    expect(apiClient.post).toHaveBeenCalledWith("/orders/o1/merge", { targetOrderId: "o2" });
  });

});
