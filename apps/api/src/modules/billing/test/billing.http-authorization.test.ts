import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleApiError } from "@/core/errors";

const mocks = vi.hoisted(() => ({
  recordPayment: vi.fn(),
  recordRefund: vi.fn(),
}));
vi.mock("@/core/auth", async () => {
  const { Elysia } = await import("elysia");
  return {
    requireAuthPlugin: () =>
      new Elysia().derive({ as: "scoped" }, () => ({
        auth: {
          userId: "11111111-1111-4111-8111-111111111111",
          tenantId: "22222222-2222-4222-8222-222222222222",
          branchId: null,
          tenantWide: false,
          email: "cashier@example.test",
          roles: [],
          permissions: ["billing:create", "billing:refund"],
        },
      })),
  };
});
vi.mock("../billing.repository", () => ({ billingRepository: mocks }));
vi.mock("@/core/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { billingRouter } from "../billing.route";

beforeEach(() => {
  vi.clearAllMocks();
});
describe("billing HTTP branch authorization", () => {
  it.each([
    [
      "/api/payments",
      {
        orderId: "33333333-3333-4333-8333-333333333333",
        amount: 10,
        method: "CASH",
      },
    ],
    [
      "/api/refunds",
      {
        paymentId: "33333333-3333-4333-8333-333333333333",
        amount: 10,
        reason: "Test",
      },
    ],
  ] as const)(
    "denies %s before any write repository is invoked",
    async (path, body) => {
      const app = new Elysia().onError(handleApiError).use(billingRouter);
      const response = await app.handle(
        new Request(`http://localhost${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      expect(response.status).toBe(403);
      expect(mocks.recordPayment).not.toHaveBeenCalled();
      expect(mocks.recordRefund).not.toHaveBeenCalled();
    },
  );
});
