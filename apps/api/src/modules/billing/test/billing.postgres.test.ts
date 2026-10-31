import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { and, eq, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Database } from "@/db";
import type { AuthContext } from "@/core/auth";
import * as schema from "@/db/schema";

const state = vi.hoisted(() => ({ db: undefined as Database | undefined }));
vi.mock("@/db", () => ({
  db: new Proxy(
    {},
    { get: (_target, property) => Reflect.get(state.db!, property) },
  ),
}));
vi.mock("@/core/audit", () => ({ writeAudit: vi.fn() }));
vi.mock("@/lib/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { billingPaymentRepository } from "../billing-payment.repository";
import { billingService } from "../billing.service";

// Opt in with a disposable PostgreSQL database. Every table, enum and fixture
// lives in a unique schema; neither public tables nor application data are used.
const url = process.env["BILLING_TEST_DATABASE_URL"];
describe.skipIf(!url)(
  "billing PostgreSQL authorization and concurrency",
  () => {
    const testSchema = `billing_test_${randomUUID().replaceAll("-", "")}`;
    let admin: ReturnType<typeof postgres>;
    let client: ReturnType<typeof postgres>;
    let database: Database;
    let auth: AuthContext;
    let otherBranch: string;
    let foreignTenant: string;
    let orderId: string;

    beforeAll(async () => {
      admin = postgres(url!, { max: 1 });
      await admin.unsafe(`CREATE SCHEMA "${testSchema}"`);
      client = postgres(url!, {
        max: 8,
        connection: { search_path: testSchema },
      });
      database = drizzle(client, { schema });
      state.db = database;
      const folder = fileURLToPath(
        new URL("../../../db/migrations/", import.meta.url),
      );
      for (const filename of readdirSync(folder)
        .filter((name) => /^\d{4}_.+\.sql$/.test(name))
        .sort()) {
        await client
          .unsafe(readFileSync(`${folder}/${filename}`, "utf8"))
          .simple();
      }
      const [user] = await database
        .insert(schema.users)
        .values({
          firstName: "Test",
          lastName: "Cashier",
          email: `${testSchema}@example.test`,
          passwordHash: "test-only",
        })
        .returning();
      const [organization] = await database
        .insert(schema.organizations)
        .values({ name: "Test", createdBy: user!.id })
        .returning();
      const [tenant] = await database
        .insert(schema.tenants)
        .values({
          name: "Test",
          createdBy: user!.id,
          organizationId: organization!.id,
        })
        .returning();
      const [foreign] = await database
        .insert(schema.tenants)
        .values({
          name: "Other",
          createdBy: user!.id,
          organizationId: organization!.id,
        })
        .returning();
      foreignTenant = foreign!.id;
      const branches = await database
        .insert(schema.branches)
        .values([
          { tenantId: tenant!.id, name: "A", code: "A", address: "Test" },
          { tenantId: tenant!.id, name: "B", code: "B", address: "Test" },
        ])
        .returning();
      otherBranch = branches[1]!.id;
      auth = {
        tenantId: tenant!.id,
        branchId: branches[0]!.id,
        tenantWide: false,
        userId: user!.id,
        email: user!.email,
        roles: [],
        permissions: ["billing:create", "billing:refund"],
      };
    }, 60_000);

    afterAll(async () => {
      await client?.end();
      if (admin) {
        await admin.unsafe(`DROP SCHEMA "${testSchema}" CASCADE`);
        await admin.end();
      }
    });
    beforeEach(async () => {
      const [order] = await database
        .insert(schema.orders)
        .values({
          tenantId: auth.tenantId,
          branchId: auth.branchId!,
          type: "DINE_IN",
          subtotal: "100.00",
          totalAmount: "100.00",
        })
        .returning();
      orderId = order!.id;
    });
    const payment = (
      overrides: Partial<
        Parameters<typeof billingPaymentRepository.recordPayment>[0]
      > = {},
    ) =>
      billingPaymentRepository.recordPayment({
        orderId,
        tenantId: auth.tenantId,
        branchId: auth.branchId,
        changedBy: auth.userId,
        method: "CASH",
        amount: 100,
        ...overrides,
      });
    const totals = async () =>
      database
        .select({ amount: sum(schema.payments.amount) })
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.orderId, orderId),
            eq(schema.payments.status, "SUCCESS"),
          ),
        );

    it("rejects branchless payments and refunds with zero changes in the database", async () => {
      const branchless = { ...auth, branchId: null };
      await expect(
        billingService.createPayment(branchless, {
          orderId,
          method: "CASH",
          amount: 100,
        }),
      ).rejects.toThrow("Billing branch access denied");
      expect(
        await database.query.bills.findMany({
          where: eq(schema.bills.orderId, orderId),
        }),
      ).toHaveLength(0);
      expect((await totals())[0]?.amount).toBeNull();
      const result = await payment();
      if (result.status !== "ok") throw new Error(result.status);
      await expect(
        billingService.createRefund(branchless, {
          paymentId: result.payment.id,
          amount: 100,
          reason: "test",
        }),
      ).rejects.toThrow("Billing branch access denied");
      await expect(
        billingService.createRefund(
          { ...auth, branchId: otherBranch },
          { paymentId: result.payment.id, amount: 100, reason: "test" },
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
      await expect(
        billingService.createRefund(
          { ...auth, tenantId: foreignTenant },
          { paymentId: result.payment.id, amount: 100, reason: "test" },
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect((await totals())[0]?.amount).toBe("100.00");
      expect(
        await database.query.paymentRefunds.findMany({
          where: eq(schema.paymentRefunds.paymentId, result.payment.id),
        }),
      ).toHaveLength(0);
    });

    it("rejects a mismatched branch and foreign tenant without creating bills", async () => {
      expect((await payment({ branchId: otherBranch })).status).toBe(
        "order_not_found",
      );
      expect((await payment({ tenantId: foreignTenant })).status).toBe(
        "order_not_found",
      );
      expect(
        await database.query.bills.findMany({
          where: eq(schema.bills.orderId, orderId),
        }),
      ).toHaveLength(0);
    });

    it("preserves explicitly permitted tenant-wide collection", async () => {
      expect((await payment({ branchId: null, tenantWide: true })).status).toBe(
        "ok",
      );
    });

    it("serializes simultaneous first payments and creates only one bill", async () => {
      const results = await Promise.all([payment(), payment()]);
      expect(results.map((result) => result.status).sort()).toEqual([
        "ok",
        "payment_exceeds_due",
      ]);
      expect((await totals())[0]?.amount).toBe("100.00");
      expect(
        await database.query.bills.findMany({
          where: eq(schema.bills.orderId, orderId),
        }),
      ).toHaveLength(1);
    });

    it("replays simultaneous duplicate submissions and rejects a conflicting payload", async () => {
      const idempotencyKey = randomUUID();
      const results = await Promise.all([
        payment({ idempotencyKey, amount: 40 }),
        payment({ idempotencyKey, amount: 40 }),
      ]);
      expect(results.every((result) => result.status === "ok")).toBe(true);
      expect((await totals())[0]?.amount).toBe("40.00");
      expect((await payment({ idempotencyKey, amount: 50 })).status).toBe(
        "idempotency_conflict",
      );
      expect(
        await database.query.paymentCollectionRequests.findMany({
          where: eq(schema.paymentCollectionRequests.orderId, orderId),
        }),
      ).toHaveLength(1);
    });

    it("serializes collection through a merged child and its canonical parent", async () => {
      const [child] = await database
        .insert(schema.orders)
        .values({
          tenantId: auth.tenantId,
          branchId: auth.branchId!,
          mergedIntoOrderId: orderId,
          type: "DINE_IN",
          subtotal: "20.00",
          totalAmount: "20.00",
        })
        .returning();
      const results = await Promise.all([
        payment({ amount: 120 }),
        payment({ orderId: child!.id, amount: 120 }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([
        "ok",
        "payment_exceeds_due",
      ]);
      expect((await totals())[0]?.amount).toBe("120.00");
    });

    it("keeps independent split balances correct under concurrent collection", async () => {
      const bills = await database
        .insert(schema.bills)
        .values(
          [40, 60].map((amount) => ({
            orderId,
            subtotal: String(amount),
            taxAmount: "0",
            totalAmount: String(amount),
          })),
        )
        .returning();
      const results = await Promise.all([
        payment({ billId: bills[0]!.id, amount: 40 }),
        payment({ billId: bills[1]!.id, amount: 60 }),
        payment({ billId: bills[0]!.id, amount: 40 }),
      ]);
      expect(results.filter((result) => result.status === "ok")).toHaveLength(
        2,
      );
      expect((await totals())[0]?.amount).toBe("100.00");
    });
  },
);
