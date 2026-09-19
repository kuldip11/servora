import { describe, expect, it } from "vitest";
import { Elysia } from "elysia";
import {
  auditListQuerySchema,
  inventoryListQuerySchema,
  orderListQuerySchema,
  staffListQuerySchema,
} from "@pos/contracts";
import {
  normalizeIntegerQueryValues,
  queryNormalizationPlugin,
} from "../core/transport/query-normalization";

describe("HTTP numeric query normalization", () => {
  it("normalizes only supported integer query keys", () => {
    const query: Record<string, unknown> = {
      page: "2",
      limit: "100",
      search: "100",
      other: "3.5",
    };

    normalizeIntegerQueryValues(query);

    expect(query).toEqual({
      page: 2,
      limit: 100,
      search: "100",
      other: "3.5",
    });
  });

  it("decodes order pagination before TypeBox validation", async () => {
    const app = new Elysia()
      .use(queryNormalizationPlugin())
      .get("/", ({ query }) => query, { query: orderListQuerySchema });

    const response = await app.handle(
      new Request("http://localhost/?status=OPEN&page=1&limit=100"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ page: 1, limit: 100 });
  });

  it("decodes staff pagination before TypeBox validation", async () => {
    const app = new Elysia()
      .use(queryNormalizationPlugin())
      .get("/", ({ query }) => query, { query: staffListQuerySchema });

    const response = await app.handle(
      new Request("http://localhost/?status=ACTIVE&page=1&limit=100"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ page: 1, limit: 100 });
  });

  it("decodes inventory pagination before TypeBox validation", async () => {
    const app = new Elysia()
      .use(queryNormalizationPlugin())
      .get("/", ({ query }) => query, { query: inventoryListQuerySchema });

    const response = await app.handle(
      new Request("http://localhost/?page=1&limit=100"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ page: 1, limit: 100 });
  });

  it("decodes audit limit before TypeBox validation", async () => {
    const app = new Elysia()
      .use(queryNormalizationPlugin())
      .get("/", ({ query }) => query, { query: auditListQuerySchema });

    const response = await app.handle(
      new Request("http://localhost/?limit=100"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ limit: 100 });
  });

  it("keeps contract bounds authoritative after normalization", async () => {
    const app = new Elysia()
      .use(queryNormalizationPlugin())
      .get("/", ({ query }) => query, { query: orderListQuerySchema });

    const response = await app.handle(
      new Request("http://localhost/?page=0&limit=101"),
    );

    expect(response.status).toBe(422);
  });
});
