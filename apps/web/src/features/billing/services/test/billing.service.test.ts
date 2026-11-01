import { describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("../../../../shared/lib/api-client", () => ({ apiClient: api }));
import { billingService } from "@/features/billing/services/billing.service";

describe("billingService", () => {
  it("records payment through the atomic billing API", async () => {
    api.post.mockResolvedValue({ data: { data: { paymentState: "PAID" } } });
    await billingService.collectPayment("o1", { method: "CARD", amount: 50 });
    expect(api.post).toHaveBeenCalledWith("/payments", {
      orderId: "o1",
      method: "CARD",
      amount: 50,
    });
  });
  it("passes a reference when supplied", async () => {
    api.post.mockResolvedValue({ data: { data: { paymentState: "PAID" } } });
    await billingService.collectPayment("o1", {
      method: "CASH",
      amount: 20,
      reference: "R-1",
    });
    expect(api.post).toHaveBeenCalledWith("/payments", {
      orderId: "o1",
      method: "CASH",
      amount: 20,
      reference: "R-1",
    });
  });
});
