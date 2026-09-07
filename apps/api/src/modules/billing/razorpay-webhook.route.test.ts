import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  increment: vi.fn(),
}));

vi.mock("elysia", async (importOriginal) => {
  const actual = await importOriginal<typeof import("elysia")>();
  class FakeElysia {
    routes: Array<{
      method: string;
      path: string;
      handler: Function | undefined;
    }> = [];
    prefix: string;
    constructor(options: { prefix?: string } = {}) {
      this.prefix = options.prefix ?? "";
    }
    post(path: string, handler: Function | undefined) {
      this.routes.push({
        method: "POST",
        path: `${this.prefix}${path}`,
        handler,
      });
      return this;
    }
  }
  return { ...actual, Elysia: FakeElysia };
});
vi.mock("./razorpay-webhook.service", () => ({
  razorpayWebhookService: { handle: mocks.handle },
}));
vi.mock("@/core/observability/metrics", () => ({
  metrics: { increment: mocks.increment },
}));

import { razorpayWebhookRouter } from "./razorpay-webhook.route";
import { ValidationError } from "@/core/errors";

const handler = (razorpayWebhookRouter as any).routes[0].handler;

describe("razorpayWebhookRouter coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handle.mockResolvedValue({ duplicate: false, queued: true });
  });

  it("passes raw body and headers to the service and returns success", async () => {
    const set: { status?: number } = {};
    const request = new Request("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-razorpay-signature": "sig",
        "x-razorpay-event-id": "event1",
      },
      body: '{"event":"payment.captured"}',
    });

    await expect(handler({ request, set })).resolves.toEqual({
      success: true,
      data: { duplicate: false, queued: true },
    });
    expect(set.status).toBe(200);
    expect(mocks.handle).toHaveBeenCalledWith(
      '{"event":"payment.captured"}',
      "sig",
      "event1",
    );
  });

  it("passes missing headers as undefined and rethrows AppError failures", async () => {
    mocks.handle.mockRejectedValueOnce(new ValidationError("bad webhook"));
    const request = new Request("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      body: "{}",
    });
    await expect(handler({ request, set: {} })).rejects.toThrow("bad webhook");
    expect(mocks.handle).toHaveBeenCalledWith("{}", undefined, undefined);
    expect(mocks.increment).toHaveBeenCalledWith(
      "servora_payment_webhook_failures_total",
      { stage: "ingress" },
    );
  });

  it("wraps unexpected failures as service unavailable", async () => {
    mocks.handle.mockRejectedValueOnce(new Error("boom"));
    const request = new Request("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      body: "{}",
    });
    await expect(handler({ request, set: {} })).rejects.toThrow(
      "Razorpay webhook processing is temporarily unavailable",
    );
    expect(mocks.increment).toHaveBeenCalledOnce();
  });
});
