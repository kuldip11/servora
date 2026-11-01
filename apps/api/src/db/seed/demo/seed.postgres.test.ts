import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/db";
import * as schema from "@/db/schema";
const state = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock("@/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db!, key) }),
}));
import { runDemoSeed, runDemoReset } from "./runner";
import { resolvePreset } from "./config";
import { uuidFor, DEMO_ORG_NAME } from "./utils";
const url = process.env["DEMO_TEST_DATABASE_URL"];

describe.skipIf(!url)(
  "demo lifecycle against canonical PostgreSQL migrations",
  () => {
    const namespace = `demo_test_${randomUUID().replaceAll("-", "")}`;
    const reference = new Date("2026-11-01T12:00:00Z");
    let admin: ReturnType<typeof postgres>;
    let client: ReturnType<typeof postgres>;
    const scalar = async (query: string) =>
      Number((await client.unsafe(query))[0]?.["count"]);
    beforeAll(async () => {
      admin = postgres(url!, { max: 1 });
      await admin.unsafe(`CREATE SCHEMA "${namespace}"`);
      client = postgres(url!, {
        max: 1,
        connection: { search_path: namespace },
      });
      await client.unsafe(`SET search_path TO "${namespace}"`);
      state.db = drizzle(client, { schema });
      await migrate(state.db, {
        migrationsFolder: fileURLToPath(
          new URL("../../migrations/", import.meta.url),
        ),
        migrationsSchema: namespace,
        migrationsTable: "demo_test_migrations",
      });
      const [user] = await state.db
        .insert(schema.users)
        .values({
          firstName: "Unrelated",
          lastName: "Owner",
          email: `${namespace}@demo.servora.local`,
          passwordHash: "test-only",
        })
        .returning();
      const [organization] = await state.db
        .insert(schema.organizations)
        .values({ name: DEMO_ORG_NAME, createdBy: user!.id })
        .returning();
      await state.db.insert(schema.tenants).values({
        name: "Unrelated restaurant",
        createdBy: user!.id,
        organizationId: organization!.id,
      });
    }, 120000);
    afterAll(async () => {
      await client?.end({ timeout: 5 });
      if (admin) {
        await admin.unsafe(`DROP SCHEMA IF EXISTS "${namespace}" CASCADE`);
        await admin.end({ timeout: 5 });
      }
    });
    it("seeds small, reconciles it and repeats without duplicates", async () => {
      const first = await runDemoSeed(resolvePreset("small", reference));
      expect(Object.values(first.ctx.branchIds).flat()).toHaveLength(8);
      expect(await scalar("SELECT count(*) FROM item_station_routing")).toBe(0);
      expect(first.orders).toBeGreaterThan(1000);
      const counts = await scalar("SELECT count(*) FROM orders");
      const again = await runDemoSeed(resolvePreset("small", reference));
      expect(again.orders).toBe(first.orders);
      expect(await scalar("SELECT count(*) FROM orders")).toBe(counts);
      expect(
        await scalar(
          "SELECT count(*) FROM tenants WHERE name='Unrelated restaurant'",
        ),
      ).toBe(1);
    }, 240000);
    it("rolls a failed replacement back to the previous complete dataset", async () => {
      const before = await scalar("SELECT count(*) FROM orders");
      expect(before).toBeGreaterThan(1000);
      const broken = resolvePreset("small", reference);
      broken.brands[0]!.menuItemCount = 0;
      await expect(runDemoSeed(broken)).rejects.toThrow();
      expect(await scalar("SELECT count(*) FROM orders")).toBe(before);
    }, 120000);
    it("resets only generated records and retains migrated RBAC and unrelated identities", async () => {
      const permissions = await scalar("SELECT count(*) FROM permissions");
      await runDemoReset();
      expect(await scalar("SELECT count(*) FROM orders")).toBe(0);
      expect(await scalar("SELECT count(*) FROM tenants")).toBe(1);
      expect(await scalar("SELECT count(*) FROM users")).toBe(1);
      expect(await scalar("SELECT count(*) FROM permissions")).toBe(
        permissions,
      );
      await runDemoReset();
      expect(await scalar("SELECT count(*) FROM tenants")).toBe(1);
    }, 120000);
    it("seeds the complete demo preset and then resets it", async () => {
      const result = await runDemoSeed(
        resolvePreset("demo", reference),
        console.log,
      );
      expect(Object.values(result.ctx.branchIds).flat()).toHaveLength(12);
      expect(result.orders).toBeGreaterThan(15000);
      console.log("Full demo seed verified; resetting it");
      await runDemoReset(console.log);
      expect(await scalar("SELECT count(*) FROM orders")).toBe(0);
    }, 300000);
    it("retains immutable audit history and rolls reset back", async () => {
      const result = await runDemoSeed(resolvePreset("small", reference));
      const tenant = Object.values(result.ctx.tenantIds)[0]!;
      await client`INSERT INTO audit_logs (tenant_id,user_id,action,entity,entity_id) VALUES (${tenant},${result.ctx.ownerUserId},'DEMO_TEST','order',${uuidFor("audit-target")})`;
      const count = await scalar("SELECT count(*) FROM orders");
      await expect(runDemoReset()).rejects.toThrow("append-only");
      expect(await scalar("SELECT count(*) FROM orders")).toBe(count);
      expect(await scalar("SELECT count(*) FROM audit_logs")).toBe(1);
      await expect(client`DELETE FROM audit_logs`).rejects.toThrow(
        "append-only",
      );
    }, 180000);
  },
);
