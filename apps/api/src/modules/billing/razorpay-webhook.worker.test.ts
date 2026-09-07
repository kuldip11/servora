import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redisInstances: [] as Array<{
    brpop: ReturnType<typeof vi.fn>;
    lpush: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
  }>,
  brpopImplementations: [] as Array<() => unknown>,
  findMany: vi.fn(),
  dbUpdate: vi.fn(),
  dbUpdateSet: vi.fn(),
  dbUpdateWhere: vi.fn(),
  processEvent: vi.fn(),
  increment: vi.fn(),
}));

vi.mock("ioredis", () => {
  class RedisMock {
    brpop = vi.fn();
    lpush = vi.fn().mockResolvedValue(1);
    quit = vi.fn().mockResolvedValue(undefined);

    constructor() {
      const implementation = mocks.brpopImplementations.shift();
      if (implementation) this.brpop.mockImplementation(implementation);
      else this.brpop.mockImplementation(() => new Promise(() => undefined));
      mocks.redisInstances.push(this);
    }
  }
  return { default: RedisMock };
});

vi.mock("@/db", () => ({
  db: {
    query: {
      paymentWebhookEvents: { findMany: mocks.findMany },
    },
    update: mocks.dbUpdate,
  },
}));

vi.mock("@/modules/billing/razorpay-webhook.service", () => ({
  razorpayWebhookService: { processEvent: mocks.processEvent },
}));

vi.mock("@/core/observability/metrics", () => ({
  metrics: { increment: mocks.increment },
}));

const flush = async () => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

const loadWorker = async (redisUrl?: string) => {
  vi.resetModules();
  if (redisUrl) process.env["REDIS_URL"] = redisUrl;
  else delete process.env["REDIS_URL"];
  return import("@/modules/billing/razorpay-webhook.worker");
};

describe("razorpay webhook worker coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.redisInstances.length = 0;
    mocks.brpopImplementations.length = 0;
    mocks.findMany.mockResolvedValue([]);
    mocks.dbUpdate.mockReturnValue({ set: mocks.dbUpdateSet });
    mocks.dbUpdateSet.mockReturnValue({ where: mocks.dbUpdateWhere });
    mocks.dbUpdateWhere.mockResolvedValue(undefined);
    mocks.processEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env["REDIS_URL"];
  });

  it("requires REDIS_URL", async () => {
    const { startRazorpayWebhookWorker } = await loadWorker();
    expect(() => startRazorpayWebhookWorker()).toThrow(
      "REDIS_URL environment variable is required",
    );
  });

  it("recovers durable events, enqueues them, advances retry time, and stops cleanly", async () => {
    mocks.findMany.mockResolvedValue([{ eventId: "e1" }, { eventId: "e2" }]);
    mocks.brpopImplementations.push(() => new Promise(() => undefined));

    const { startRazorpayWebhookWorker } = await loadWorker("redis://test");
    const stop = startRazorpayWebhookWorker();
    await flush();

    expect(mocks.redisInstances).toHaveLength(2);
    const recoveryRedis = mocks.redisInstances[1]!;
    expect(recoveryRedis.lpush).toHaveBeenNthCalledWith(
      1,
      "pos:queue:razorpay_webhooks",
      "e1",
    );
    expect(recoveryRedis.lpush).toHaveBeenNthCalledWith(
      2,
      "pos:queue:razorpay_webhooks",
      "e2",
    );
    expect(mocks.dbUpdateSet).toHaveBeenCalledWith({
      nextAttemptAt: expect.any(Date),
    });
    expect(recoveryRedis.quit).toHaveBeenCalledOnce();

    stop();
    expect(mocks.redisInstances[0]!.quit).toHaveBeenCalledOnce();
  });

  it("processes dequeued events and records worker processing failures", async () => {
    let call = 0;
    mocks.brpopImplementations.push(() => {
      call += 1;
      if (call === 1)
        return Promise.resolve(["pos:queue:razorpay_webhooks", "e1"]);
      if (call === 2)
        return Promise.resolve(["pos:queue:razorpay_webhooks", "e2"]);
      return new Promise(() => undefined);
    });
    mocks.processEvent
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("process failed"));
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { startRazorpayWebhookWorker } = await loadWorker("redis://test");
    const stop = startRazorpayWebhookWorker();
    await flush();
    await flush();

    expect(mocks.processEvent).toHaveBeenNthCalledWith(1, "e1");
    expect(mocks.processEvent).toHaveBeenNthCalledWith(2, "e2");
    expect(mocks.increment).toHaveBeenCalledWith(
      "servora_payment_webhook_failures_total",
      { stage: "worker" },
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[Razorpay Worker] Failed event e2",
      expect.any(Error),
    );

    stop();
    errorSpy.mockRestore();
  });

  it("records Redis queue failures, backs off, and exits after stop", async () => {
    mocks.brpopImplementations.push(() =>
      Promise.reject(new Error("redis down")),
    );
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { startRazorpayWebhookWorker } = await loadWorker("redis://test");
    const stop = startRazorpayWebhookWorker();
    await flush();

    expect(mocks.increment).toHaveBeenCalledWith(
      "servora_payment_webhook_failures_total",
      { stage: "queue" },
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[Razorpay Worker] Redis error",
      expect.any(Error),
    );

    stop();
    await vi.advanceTimersByTimeAsync(1000);
    errorSpy.mockRestore();
  });

  it("logs initial and interval recovery scan failures", async () => {
    mocks.findMany.mockRejectedValue(new Error("scan failed"));
    mocks.brpopImplementations.push(() => new Promise(() => undefined));
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const { startRazorpayWebhookWorker } = await loadWorker("redis://test");
    const stop = startRazorpayWebhookWorker();
    await flush();

    expect(errorSpy).toHaveBeenCalledWith(
      "[Razorpay Worker] Initial recovery scan failed",
      expect.any(Error),
    );

    await vi.advanceTimersByTimeAsync(30_000);
    await flush();
    expect(errorSpy).toHaveBeenCalledWith(
      "[Razorpay Worker] Recovery scan failed",
      expect.any(Error),
    );

    stop();
    errorSpy.mockRestore();
  });
  it("continues polling when BRPOP times out without an event", async () => {
    let call = 0;
    mocks.brpopImplementations.push(() => {
      call += 1;
      if (call === 1) return Promise.resolve(null);
      return new Promise(() => undefined);
    });

    const { startRazorpayWebhookWorker } = await loadWorker("redis://test");
    const stop = startRazorpayWebhookWorker();
    await flush();

    expect(mocks.redisInstances[0]!.brpop).toHaveBeenCalledTimes(2);
    expect(mocks.processEvent).not.toHaveBeenCalled();
    stop();
  });
});
