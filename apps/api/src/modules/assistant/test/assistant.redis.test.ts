import { randomUUID } from "node:crypto";
import Redis from "ioredis";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const state = vi.hoisted(() => ({ client: undefined as Redis | undefined }));
vi.mock("@/lib/redis", () => ({
  redis: new Proxy(
    {},
    {
      get(_target, key) {
        const value = state.client?.[key as keyof Redis];
        return typeof value === "function" ? value.bind(state.client) : value;
      },
    },
  ),
}));
import { reserveAssistantTurn } from "../assistant.limits";
import { recordAssistantUsage } from "../assistant.usage";
import { env } from "@/config/env";
const url = process.env["ASSISTANT_TEST_REDIS_URL"];
const sessions: string[] = [];
const tenants: string[] = [];
const session = () => {
  const id = `concierge-test-${randomUUID()}`;
  sessions.push(id);
  return id;
};
const tenant = () => {
  const id = `concierge-test-${randomUUID()}`;
  tenants.push(id);
  return id;
};

describe.skipIf(!url)("Concierge native Redis integration", () => {
  beforeEach(() => {
    const bucketTime = Math.floor(Date.now() / 60000) * 60000 + 1000;
    vi.spyOn(Date, "now").mockReturnValue(bucketTime);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  beforeAll(async () => {
    state.client = new Redis(url!, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
    });
    await state.client.connect();
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    if (!state.client) return;
    try {
      // Delete only this run's random namespaces. Never FLUSHDB or application keys.
      for (const pattern of [
        ...sessions.map((id) => `assistant:session:${id}:*`),
        ...tenants.flatMap((id) => [
          `assistant:tenant:${id}:*`,
          `assistant:usage:${id}:*`,
        ]),
      ]) {
        let cursor = "0";
        do {
          const page = await state.client.scan(
            cursor,
            "MATCH",
            pattern,
            "COUNT",
            100,
          );
          cursor = page[0];
          if (page[1].length) await state.client.del(...page[1]);
        } while (cursor !== "0");
      }
    } finally {
      await state.client.quit();
    }
  });
  it("enforces six concurrent turns atomically and gives every key an expiry", async () => {
    const t = tenant(),
      s = session(),
      now = Date.now(),
      expires = new Date(now + 3600000);
    const outcomes = await Promise.allSettled(
      Array.from({ length: 20 }, () => reserveAssistantTurn(t, s, expires)),
    );
    expect(outcomes.filter((row) => row.status === "fulfilled")).toHaveLength(
      6,
    );
    for (const row of outcomes)
      if (row.status === "rejected") expect(row.reason.statusCode).toBe(429);
    const keys = [
      `assistant:session:${s}:minute:${Math.floor(now / 60000)}`,
      `assistant:session:${s}:turns`,
      `assistant:tenant:${t}:day:${Math.floor(now / 86400000)}`,
    ];
    expect(await state.client!.mget(...keys)).toEqual(["6", "6", "6"]);
    for (const key of keys)
      expect(await state.client!.ttl(key)).toBeGreaterThan(0);
  });
  it("isolates each session's minute budget while sharing the tenant budget", async () => {
    const t = tenant(),
      a = session(),
      b = session(),
      expires = new Date(Date.now() + 3600000);
    await Promise.all(
      [a, b].flatMap((s) =>
        Array.from({ length: 6 }, () => reserveAssistantTurn(t, s, expires)),
      ),
    );
    expect(await state.client!.get(`assistant:session:${a}:turns`)).toBe("6");
    expect(await state.client!.get(`assistant:session:${b}:turns`)).toBe("6");
    expect(
      await state.client!.get(
        `assistant:tenant:${t}:day:${Math.floor(Date.now() / 86400000)}`,
      ),
    ).toBe("12");
  });
  it("caps lifetime turns even after the minute bucket changes", async () => {
    const t = tenant(),
      s = session(),
      now = Date.now(),
      expires = new Date(now + 3600000);
    const clock = vi.spyOn(Date, "now");
    try {
      for (let minute = 0; minute < 5; minute++) {
        clock.mockReturnValue(now + minute * 60000);
        for (let turn = 0; turn < 6; turn++)
          await reserveAssistantTurn(t, s, expires);
      }
      clock.mockReturnValue(now + 5 * 60000);
      await expect(reserveAssistantTurn(t, s, expires)).rejects.toMatchObject({
        statusCode: 429,
      });
      expect(await state.client!.get(`assistant:session:${s}:turns`)).toBe(
        "30",
      );
    } finally {
      clock.mockRestore();
    }
  });
  it("does not consume a session turn when the shared tenant budget rejects it", async () => {
    const t = tenant(),
      s = session();
    const key = `assistant:tenant:${t}:day:${Math.floor(Date.now() / 86400000)}`;
    await state.client!.set(
      key,
      String(env.ASSISTANT_DAILY_TURN_LIMIT),
      "EX",
      86400,
    );
    await expect(
      reserveAssistantTurn(t, s, new Date(Date.now() + 3600000)),
    ).rejects.toMatchObject({ statusCode: 429 });
    expect(await state.client!.get(`assistant:session:${s}:turns`)).toBeNull();
  });
  it("aggregates only usage counters and applies the retention TTL", async () => {
    const t = tenant();
    await recordAssistantUsage(t, 10, 20);
    await recordAssistantUsage(t, 3, 4);
    const key = `assistant:usage:${t}:${new Date().toISOString().slice(0, 10)}`;
    expect(await state.client!.hgetall(key)).toEqual({
      inputTokens: "13",
      outputTokens: "24",
      modelCalls: "2",
    });
    const ttl = await state.client!.ttl(key);
    expect(ttl).toBeGreaterThan(30 * 86400);
    expect(ttl).toBeLessThanOrEqual(31 * 86400);
  });
});
