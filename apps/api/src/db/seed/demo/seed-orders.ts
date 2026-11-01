import { calculateTaxServiceAndRounding } from "@/modules/orders/pricing/final-totals-stage";
import type { SeedDatabase, DemoConfig, SeedContext } from "./types";
import {
  billOrderItems,
  bills,
  kitchenTickets,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  paymentRefunds,
  promotionRedemptions,
  customerSessions,
  customerRequests,
} from "@/db/schema";
import { catalogItem } from "./catalog";
import { money, seededNumber, uuidFor } from "./utils";

const paymentMethods = ["CASH", "CARD", "UPI", "RAZORPAY", "STRIPE"] as const;
const orderTypes = ["DINE_IN", "TAKEAWAY", "DELIVERY", "ONLINE"] as const;

export const seedOrders = async (
  db: SeedDatabase,
  config: DemoConfig,
  ctx: SeedContext,
): Promise<{ orders: number; orderItems: number }> => {
  let totalOrders = 0;
  let totalItems = 0;
  const now = config.referenceTime;

  for (const brand of config.brands) {
    const tenantId = ctx.tenantIds[brand.key]!;
    for (const [branchIndex, branchId] of ctx.branchIds[brand.key]!.entries()) {
      const staffIds = ctx.staffUserIdsByBranch[branchId]!;
      const orderRows: (typeof orders.$inferInsert)[] = [];
      const ticketRows: (typeof kitchenTickets.$inferInsert)[] = [];
      const itemRows: (typeof orderItems.$inferInsert)[] = [];
      const billRows: (typeof bills.$inferInsert)[] = [];
      const billItemRows: (typeof billOrderItems.$inferInsert)[] = [];
      const paymentRows: (typeof payments.$inferInsert)[] = [];
      const refundRows: (typeof paymentRefunds.$inferInsert)[] = [];
      const historyRows: (typeof orderStatusHistory.$inferInsert)[] = [];
      const redemptionRows: (typeof promotionRedemptions.$inferInsert)[] = [];

      const requestRows: Array<typeof customerRequests.$inferInsert> = [];
      let ticketNo = 1;
      for (let day = config.historyDays; day >= 1; day--) {
        const localNow = new Date(now.getTime() + 330 * 60000);
        const date = new Date(
          Date.UTC(
            localNow.getUTCFullYear(),
            localNow.getUTCMonth(),
            localNow.getUTCDate() - day,
          ),
        );
        const dayOfWeek = date.getUTCDay();
        const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.35 : 1;
        const count = Math.max(
          1,
          Math.round(config.ordersPerBranchPerDay * weekendMultiplier),
        );

        for (let n = 0; n < count; n++) {
          const key = `${brand.key}:${branchIndex}:${day}:${n}`;
          const orderId = uuidFor(`order:${key}`);
          const ticketId = uuidFor(`ticket:${key}`);
          const scenario = day * config.ordersPerBranchPerDay + n;
          const status =
            scenario % 40 === 0
              ? ("CANCELLED" as const)
              : scenario % 17 === 0
                ? ("CLOSED" as const)
                : ("PAID" as const);
          const type = orderTypes[scenario % orderTypes.length]!;
          const hourRand = seededNumber(`hour:${key}`);
          const hour =
            hourRand < 0.18
              ? 9 + Math.floor(hourRand * 10)
              : hourRand < 0.55
                ? 12 + Math.floor(hourRand * 5)
                : 18 + Math.floor(hourRand * 5);
          const createdAt = new Date(
            date.getTime() +
              (Math.min(hour, 22) * 60 +
                Math.floor(seededNumber(`minute:${key}`) * 60) -
                330) *
                60000,
          );
          const lineCount = 1 + Math.floor(seededNumber(`lines:${key}`) * 4);
          let subtotal = 0;
          const currentItemRows: (typeof orderItems.$inferInsert)[] = [];

          for (let line = 0; line < lineCount; line++) {
            const itemIndex = Math.floor(
              seededNumber(`item:${key}:${line}`) * (brand.menuItemCount - 6),
            );
            const menuItemId = uuidFor(`item:${brand.key}:${itemIndex}`);
            const spec = catalogItem(
              brand,
              config.brands.indexOf(brand),
              itemIndex,
            );
            const root = spec.name;
            const quantity = seededNumber(`qty:${key}:${line}`) > 0.8 ? 2 : 1;
            const unitPrice = spec.price;
            const lineSubtotal = unitPrice * quantity;
            subtotal += lineSubtotal;
            const resolutionAsOf = createdAt;
            currentItemRows.push({
              id: uuidFor(`order-item:${key}:${line}`),
              orderId,
              kitchenTicketId: ticketId,
              menuItemId,
              menuItemName: root,
              quantity,
              unitPrice: money(unitPrice),
              subtotal: money(lineSubtotal),
              taxRate: "5.00",
              taxMode: "EXCLUSIVE",
              pricingAttribution: {
                BASE_PRICE: unitPrice,
                VARIANT: 0,
                MODIFIER: 0,
                TAXABLE_BASE: lineSubtotal,
                PRICE_SOURCE: {
                  kind: "MENU_ITEM",
                  id: menuItemId,
                  description: "Demo menu price",
                },
              },
              fulfillmentType: type === "DINE_IN" ? "DINE_IN" : "TAKEAWAY",
              stationId: uuidFor(
                `station:${brand.key}:${branchIndex}:${spec.station}`,
              ),
              resolutionAsOf,
              availabilitySnapshot: {
                asOf: resolutionAsOf.toISOString(),
                branchId,
                channel: "STAFF",
                fulfillmentType: type,
                effectiveStatus: "ACTIVE",
                isHidden: false,
                reason: null,
                cause: "DEMO_SEED",
              },
              pricingReplayEvidence: { source: "DEMO_SEED", unitPrice },
              availabilityReplayEvidence: {
                source: "DEMO_SEED",
                status: "ACTIVE",
              },
              itemStatus: status === "CANCELLED" ? "VOIDED" : "ACTIVE",
              voidedReason:
                status === "CANCELLED" ? "Guest changed their mind" : null,
              voidedBy:
                status === "CANCELLED"
                  ? (staffIds[n % staffIds.length] ?? ctx.ownerUserId)
                  : null,
              voidedAt:
                status === "CANCELLED"
                  ? new Date(createdAt.getTime() + 25 * 60000)
                  : null,
              createdAt,
            });
          }

          const discount =
            seededNumber(`discount:${key}`) < 0.18
              ? Math.round(subtotal * 0.1 * 100) / 100
              : 0;
          const pricedLines = currentItemRows.map((line) => {
            const attribution = line.pricingAttribution!;
            if (discount > 0)
              attribution.PROMOTION =
                -Math.round(Number(line.subtotal) * 10) / 100;
            return {
              menuItemId: line.menuItemId ?? null,
              menuItemName: line.menuItemName,
              quantity: line.quantity,
              unitPrice: Number(line.unitPrice),
              subtotal: Number(line.subtotal),
              taxRate: 5,
              taxMode: "EXCLUSIVE" as const,
              fulfillmentType: line.fulfillmentType ?? "DINE_IN",
              modifiers: [],
              pricingAttribution: attribution,
            };
          });
          const final = calculateTaxServiceAndRounding(pricedLines, {
            serviceChargePercent: brand.key === "qsr" ? "0" : "5",
            serviceChargeTaxable: false,
            roundingPolicy: "NONE",
            defaultTaxMode: "EXCLUSIVE",
          });
          const tax = final.taxAmount;
          const service = final.serviceChargeAmount;
          const total = final.totalAmount;
          const customerIndex = Math.floor(
            seededNumber(`customer:${key}`) * config.customersPerTenant,
          );
          const customerId = uuidFor(`customer:${brand.key}:${customerIndex}`);
          const tableId =
            type === "DINE_IN"
              ? uuidFor(
                  `table:${brand.key}:${branchIndex}:${Math.floor(seededNumber(`table:${key}`) * config.tablesPerBranch)}`,
                )
              : null;
          const createdBy = staffIds[n % staffIds.length] ?? ctx.ownerUserId;

          orderRows.push({
            id: orderId,
            tenantId,
            branchId,
            tableId,
            customerId,
            createdBy,
            source: "STAFF",
            status,
            type,
            subtotal: money(subtotal),
            taxAmount: money(tax),
            discountAmount: money(discount),
            serviceChargeAmount: money(service),
            totalAmount: money(total),
            resolutionAsOf: createdAt,
            createdAt,
            updatedAt: new Date(createdAt.getTime() + 25 * 60000),
          });
          ticketRows.push({
            id: ticketId,
            tenantId,
            branchId,
            orderId,
            ticketNumber: ticketNo++,
            status: status === "CANCELLED" ? "HELD" : "SERVED",
            firedAt: status === "CANCELLED" ? null : createdAt,
            readyAt:
              status === "CANCELLED"
                ? null
                : new Date(createdAt.getTime() + 12 * 60000),
            servedAt:
              status === "CANCELLED"
                ? null
                : new Date(createdAt.getTime() + 16 * 60000),
            createdAt,
            updatedAt: createdAt,
          });
          itemRows.push(...currentItemRows);
          historyRows.push({
            id: uuidFor(`history:${key}:open`),
            orderId,
            oldStatus: null,
            newStatus: "OPEN",
            changedBy: createdBy,
            changedAt: createdAt,
          });
          historyRows.push({
            id: uuidFor(`history:${key}:final`),
            orderId,
            oldStatus: "OPEN",
            newStatus: status,
            changedBy: createdBy,
            changedAt: new Date(createdAt.getTime() + 25 * 60000),
          });

          if (status !== "CANCELLED") {
            const billId = uuidFor(`bill:${key}`);
            const paymentId = uuidFor(`payment:${key}`);
            billRows.push({
              id: billId,
              orderId,
              subtotal: money(subtotal),
              taxAmount: money(tax),
              discountAmount: money(discount),
              serviceChargeAmount: money(service),
              totalAmount: money(total),
              gstNumber: "27ABCDE1234F1Z5",
              createdAt: new Date(createdAt.getTime() + 20 * 60000),
            });
            for (const item of currentItemRows)
              billItemRows.push({
                id: uuidFor(`bill-item:${key}:${item.id}`),
                billId,
                orderItemId: item.id!,
                allocationRatio: "1.000000",
              });
            const isRefunded = scenario % 53 === 0;
            paymentRows.push({
              id: paymentId,
              orderId,
              billId,
              method: paymentMethods[scenario % paymentMethods.length]!,
              status: isRefunded ? "REFUNDED" : "SUCCESS",
              amount: money(total),
              reference: `DEMO-${orderId.slice(0, 8)}`,
              metadata: JSON.stringify({ demo: true, preset: config.preset }),
              createdAt: new Date(createdAt.getTime() + 24 * 60000),
              updatedAt: new Date(
                createdAt.getTime() + (isRefunded ? 48 : 24) * 60000,
              ),
            });
            if (isRefunded)
              refundRows.push({
                id: uuidFor(`refund:${key}`),
                paymentId,
                amount: money(total),
                reason: "Demo full refund",
                processedBy: createdBy,
                createdAt: new Date(createdAt.getTime() + 48 * 60000),
              });
            if (discount > 0)
              redemptionRows.push({
                id: uuidFor(`redemption:${key}`),
                promotionId: uuidFor(`promo:${brand.key}:weekday`),
                orderId,
                customerId,
                discountAmount: money(discount),
                redeemedAt: createdAt,
              });
          }
        }
      }

      const liveCount = Math.min(6, config.tablesPerBranch);
      const liveTicketStatuses = [
        "PENDING_PAYMENT",
        "HELD",
        "FIRED",
        "PREPARING",
        "READY",
        "SERVED",
      ] as const;
      for (let n = 0; n < liveCount; n++) {
        const key = `${brand.key}:${branchIndex}:live:${n}`;
        const orderId = uuidFor(`order:${key}`);
        const ticketId = uuidFor(`ticket:${key}`);
        const menuItemId = uuidFor(
          `item:${brand.key}:${n % brand.menuItemCount}`,
        );
        const spec = catalogItem(brand, config.brands.indexOf(brand), n);
        const unitPrice = spec.price;
        const tax = Math.round(unitPrice * 5) / 100;
        const service = brand.key === "qsr" ? 0 : tax;
        const total = unitPrice + tax + service;
        const createdAt = new Date(now.getTime() - (8 + n * 4) * 60000);
        const sessionId = uuidFor(`session:${key}`);
        await db.insert(customerSessions).values({
          id: sessionId,
          tenantId,
          branchId,
          tableId: uuidFor(`table:${brand.key}:${branchIndex}:${n}`),
          token: uuidFor(`session-token:${key}`),
          expiresAt: new Date(now.getTime() + 12 * 3600000),
          createdAt,
        });
        if (n === 2 || n === 4)
          requestRows.push({
            id: uuidFor(`request:${key}`),
            tenantId,
            branchId,
            tableId: uuidFor(`table:${brand.key}:${branchIndex}:${n}`),
            customerSessionId: sessionId,
            orderId,
            type: n === 4 ? "BILL" : "WATER",
            status: "OPEN",
            createdAt: new Date(now.getTime() - 5 * 60000),
          });
        const tableId = uuidFor(`table:${brand.key}:${branchIndex}:${n}`);
        const ticketStatus = liveTicketStatuses[n]!;
        orderRows.push({
          id: orderId,
          tenantId,
          branchId,
          tableId,
          customerId: uuidFor(`customer:${brand.key}:${n}`),
          createdBy: staffIds[n % staffIds.length] ?? ctx.ownerUserId,
          source: n === 0 ? "CUSTOMER_QR" : "STAFF",
          customerSessionId: sessionId,
          status: n === 4 ? "BILL_REQUESTED" : "OPEN",
          type: "DINE_IN",
          subtotal: money(unitPrice),
          taxAmount: money(tax),
          serviceChargeAmount: money(service),
          totalAmount: money(total),
          resolutionAsOf: createdAt,
          notes: n === 1 ? "Demo order with guest notes: nut allergy" : null,
          createdAt,
          updatedAt: createdAt,
        });
        ticketRows.push({
          id: ticketId,
          tenantId,
          branchId,
          orderId,
          ticketNumber: ticketNo++,
          status: ticketStatus,
          firedAt:
            ticketStatus === "PENDING_PAYMENT" || ticketStatus === "HELD"
              ? null
              : createdAt,
          readyAt: n >= 4 ? new Date(createdAt.getTime() + 10 * 60000) : null,
          servedAt: n === 5 ? new Date(createdAt.getTime() + 14 * 60000) : null,
          notes: n === 1 ? "Hold until guest confirms" : null,
          createdAt,
          updatedAt: createdAt,
        });
        itemRows.push({
          id: uuidFor(`order-item:${key}:0`),
          orderId,
          kitchenTicketId: ticketId,
          menuItemId,
          menuItemName: spec.name,
          quantity: 1,
          unitPrice: money(unitPrice),
          subtotal: money(unitPrice),
          taxRate: "5.00",
          taxMode: "EXCLUSIVE",
          pricingAttribution: {
            BASE_PRICE: unitPrice,
            VARIANT: 0,
            MODIFIER: 0,
          },
          chefNotes: n === 1 ? "No nuts; allergy noted" : null,
          seatLabel: "Seat 1",
          fulfillmentType: "DINE_IN",
          stationId: uuidFor(
            `station:${brand.key}:${branchIndex}:${spec.station}`,
          ),
          resolutionAsOf: createdAt,
          availabilitySnapshot: {
            asOf: createdAt.toISOString(),
            branchId,
            channel: n === 0 ? "CUSTOMER_QR" : "STAFF",
            fulfillmentType: "DINE_IN",
            effectiveStatus: "ACTIVE",
            isHidden: false,
            reason: null,
            cause: "DEMO_SEED",
          },
          pricingReplayEvidence: { source: "DEMO_SEED" },
          availabilityReplayEvidence: { source: "DEMO_SEED" },
          itemStatus: "ACTIVE",
          createdAt,
        });
        historyRows.push({
          id: uuidFor(`history:${key}:open`),
          orderId,
          oldStatus: null,
          newStatus: "OPEN",
          changedBy: staffIds[n % staffIds.length] ?? ctx.ownerUserId,
          changedAt: createdAt,
        });
        if (n === 4)
          historyRows.push({
            id: uuidFor(`history:${key}:bill`),
            orderId,
            oldStatus: "OPEN",
            newStatus: "BILL_REQUESTED",
            changedBy: staffIds[n % staffIds.length] ?? ctx.ownerUserId,
            changedAt: new Date(now.getTime() - 3 * 60000),
          });
        if (n === 4) {
          const billId = uuidFor(`bill:${key}`);
          billRows.push({
            id: billId,
            orderId,
            subtotal: money(unitPrice),
            taxAmount: money(tax),
            discountAmount: "0.00",
            serviceChargeAmount: money(service),
            totalAmount: money(total),
            createdAt: new Date(now.getTime() - 3 * 60000),
          });
          billItemRows.push({
            id: uuidFor(`bill-item:${key}:0`),
            billId,
            orderItemId: uuidFor(`order-item:${key}:0`),
            allocationRatio: "1.000000",
          });
        }
        if (n < 2)
          paymentRows.push({
            id: uuidFor(`payment:${key}:attempt`),
            orderId,
            method: n === 0 ? "RAZORPAY" : "CARD",
            status: n === 0 ? "PENDING" : "FAILED",
            amount: money(total),
            reference: `DEMO-ATTEMPT-${orderId.slice(0, 8)}`,
            metadata: JSON.stringify({
              demo: true,
              expectedOutcome: n === 0 ? "pending" : "declined",
            }),
            createdAt,
            updatedAt: createdAt,
          });
      }

      for (let i = 0; i < orderRows.length; i += 500)
        await db.insert(orders).values(orderRows.slice(i, i + 500));
      if (requestRows.length)
        await db.insert(customerRequests).values(requestRows);
      for (let i = 0; i < ticketRows.length; i += 500)
        await db.insert(kitchenTickets).values(ticketRows.slice(i, i + 500));
      for (let i = 0; i < itemRows.length; i += 500)
        await db.insert(orderItems).values(itemRows.slice(i, i + 500));
      for (let i = 0; i < historyRows.length; i += 500)
        await db
          .insert(orderStatusHistory)
          .values(historyRows.slice(i, i + 500));
      for (let i = 0; i < billRows.length; i += 500)
        await db.insert(bills).values(billRows.slice(i, i + 500));
      for (let i = 0; i < billItemRows.length; i += 500)
        await db.insert(billOrderItems).values(billItemRows.slice(i, i + 500));
      for (let i = 0; i < paymentRows.length; i += 500)
        await db.insert(payments).values(paymentRows.slice(i, i + 500));
      for (let i = 0; i < refundRows.length; i += 500)
        await db.insert(paymentRefunds).values(refundRows.slice(i, i + 500));
      for (let i = 0; i < redemptionRows.length; i += 500)
        await db
          .insert(promotionRedemptions)
          .values(redemptionRows.slice(i, i + 500));
      totalOrders += orderRows.length;
      totalItems += itemRows.length;
    }
  }
  return { orders: totalOrders, orderItems: totalItems };
};
