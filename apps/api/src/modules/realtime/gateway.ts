import { Elysia } from "elysia";
import { ForbiddenError } from "@/core/errors";
import { subscriber, REDIS_CHANNELS } from "@/lib/redis";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import { db } from "@/db";
import {
  resolveAuthorization,
  resolveMembership,
} from "@/core/auth/authorization";
import { shouldDeliverRealtimeEvent } from "./delivery-scope";
import { customerService } from "@/modules/customer/customer.service";
import { metrics } from "@/core/observability/metrics";
import { createLogger, toError } from "@/core/logger/logger";
import { REALTIME_AUTH_TIMEOUT_MS } from "./constants";
import { Value } from "@sinclair/typebox/value";
import {
  customerRealtimeAuthMessageSchema,
  realtimeEnvelopeSchema,
  staffRealtimeAuthMessageSchema,
  type RealtimeEnvelope,
} from "@pos/contracts";

const logger = createLogger({}, "realtime-gateway");

interface RealtimeSocket {
  send(message: string): unknown;
  close(): unknown;
}

const customerClients = new Map<string, Set<RealtimeSocket>>();
interface CustomerBranchSocket {
  send(message: string): unknown;
}
const customerBranchClients = new Map<string, Set<CustomerBranchSocket>>();
const customerScopeBySocket = new WeakMap<
  object,
  { tenantId: string; branchId: string }
>();
const customerSessionBySocket = new WeakMap<object, string>();

const customerBranchKey = (tenantId: string, branchId: string) => {
  return `${tenantId}:${branchId}`;
};
const addCustomerBranchClient = (
  tenantId: string,
  branchId: string,
  ws: CustomerBranchSocket,
) => {
  const key = customerBranchKey(tenantId, branchId);
  if (!customerBranchClients.has(key))
    customerBranchClients.set(key, new Set());
  customerBranchClients.get(key)!.add(ws);
};
const removeCustomerBranchClient = (
  tenantId: string,
  branchId: string,
  ws: CustomerBranchSocket,
) => {
  const key = customerBranchKey(tenantId, branchId);
  const set = customerBranchClients.get(key);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) customerBranchClients.delete(key);
};

const addCustomerClient = (sessionId: string, ws: RealtimeSocket) => {
  if (!customerClients.has(sessionId))
    customerClients.set(sessionId, new Set());
  customerClients.get(sessionId)!.add(ws);
};
const removeCustomerClient = (sessionId: string, ws: RealtimeSocket) => {
  const set = customerClients.get(sessionId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) customerClients.delete(sessionId);
};

const parseJsonMessage = (message: unknown): unknown => {
  if (typeof message !== "string") return message;
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return undefined;
  }
};

const parseRealtimeEnvelope = (
  message: string,
): RealtimeEnvelope | undefined => {
  const parsed = parseJsonMessage(message);
  return Value.Check(realtimeEnvelopeSchema, parsed) ? parsed : undefined;
};

const customerSessionIdFromEvent = (
  event: RealtimeEnvelope,
): string | undefined => {
  if (
    event.type === "customer.request.created" ||
    event.type === "customer.request.updated"
  )
    return event.payload?.customerSessionId;
  if (event.type === "order.created" || event.type === "order.updated")
    return (
      event.payload?.customerSessionId ?? event.payload?.customerSession?.id
    );
  return undefined;
};

const clients = new Map<string, Set<RealtimeSocket>>();
const staffScopeBySocket = new WeakMap<
  object,
  { tenantId: string; branchId: string | null }
>();
let staffConnectionCount = 0;
let customerConnectionCount = 0;
const authTimerBySocket = new WeakMap<object, ReturnType<typeof setTimeout>>();

const startAuthTimer = (ws: RealtimeSocket): void => {
  const timer = setTimeout(() => {
    authTimerBySocket.delete(ws as object);
    ws.send(JSON.stringify({ type: "error", code: "AUTH_TIMEOUT" }));
    ws.close();
  }, REALTIME_AUTH_TIMEOUT_MS);
  authTimerBySocket.set(ws as object, timer);
};

const clearAuthTimer = (ws: RealtimeSocket): void => {
  const timer = authTimerBySocket.get(ws as object);
  if (timer) clearTimeout(timer);
  authTimerBySocket.delete(ws as object);
};

const addClient = (tenantId: string, ws: RealtimeSocket) => {
  if (!clients.has(tenantId)) {
    clients.set(tenantId, new Set());
  }
  clients.get(tenantId)!.add(ws);
};

const removeClient = (tenantId: string, ws: RealtimeSocket) => {
  const tenantClients = clients.get(tenantId);
  if (!tenantClients) return;
  tenantClients.delete(ws);
  if (tenantClients.size === 0) clients.delete(tenantId);
};

export const resolveRealtimeContext = async (
  payload: JwtPayload,
  tenantId: string,
  branchId?: string,
) => {
  if (!tenantId) throw new ForbiddenError("Active franchise is required");

  const membership = await resolveMembership(db, payload.sub, tenantId);
  if (!membership) throw new ForbiddenError("Active franchise is required");

  const decision = await resolveAuthorization(db, {
    userId: payload.sub,
    tenantId: membership.tenantId,
    branchId: branchId && branchId !== "all" ? branchId : null,
  });
  if (
    !decision.allowed ||
    !decision.permissionKeys.some((key) =>
      ["orders:read", "kitchen:read", "inventory:read", "tables:read"].includes(
        key,
      ),
    )
  ) {
    throw new ForbiddenError("Realtime permission is required");
  }

  if (
    branchId &&
    branchId !== "all" &&
    !decision.branchIds.includes(branchId) &&
    !decision.tenantWide
  ) {
    throw new ForbiddenError("Realtime branch access denied");
  }

  return {
    tenantId: membership.tenantId,
    membershipId: membership.id,
    branchId: branchId && branchId !== "all" ? branchId : null,
  };
};

export const forwardTenantRealtimeMessage = (
  message: string,
  tenantClients: Map<
    string,
    Set<{ __branchId?: string | null; send(message: string): void }>
  > = clients,
): void => {
  const event = parseRealtimeEnvelope(message);
  if (!event) return;
  const scopedClients = tenantClients.get(event.tenantId);
  if (!scopedClients) return;
  for (const ws of scopedClients) {
    if (!shouldDeliverRealtimeEvent(ws.__branchId, event.branchId)) continue;
    try {
      ws.send(message);
    } catch {
      if (tenantClients === clients)
        removeClient(event.tenantId, ws as RealtimeSocket);
    }
  }
};

let redisSubscriptionStarted = false;

export const startRealtimeRedisSubscription = async (): Promise<void> => {
  if (redisSubscriptionStarted) return;
  redisSubscriptionStarted = true;
  try {
    await subscriber.subscribe(
      REDIS_CHANNELS.ORDER_EVENTS,
      REDIS_CHANNELS.KITCHEN_EVENTS,
      REDIS_CHANNELS.INVENTORY_EVENTS,
      REDIS_CHANNELS.TABLE_EVENTS,
    );

    subscriber.on("message", (channel, message) => {
      try {
        const event = parseRealtimeEnvelope(message);
        if (!event) throw new Error("Invalid realtime event envelope");
        const sessionId = customerSessionIdFromEvent(event);
        if (sessionId) {
          const sessionClients = customerClients.get(sessionId);
          if (sessionClients) {
            for (const ws of sessionClients) {
              try {
                ws.send(message);
              } catch {
                removeCustomerClient(sessionId, ws);
              }
            }
          }
        }
        if (
          event.tenantId &&
          event.branchId &&
          event.type === "menu.availability.updated"
        ) {
          const branchClients = customerBranchClients.get(
            customerBranchKey(event.tenantId, event.branchId),
          );
          if (branchClients) {
            for (const ws of branchClients) {
              try {
                ws.send(message);
              } catch {
                removeCustomerBranchClient(event.tenantId, event.branchId, ws);
              }
            }
          }
        }

        if (event.tenantId) forwardTenantRealtimeMessage(message);
      } catch (err) {
        logger.error("realtime.redis_message_failed", toError(err));
      }
    });
  } catch (error) {
    redisSubscriptionStarted = false;
    throw error;
  }
};

export const realtimeRouter = new Elysia({ prefix: "/ws" }).ws("/events", {
  open(ws) {
    startAuthTimer(ws);
  },

  async message(ws, message) {
    if (message === "ping") {
      if (!staffScopeBySocket.has(ws)) {
        ws.send(JSON.stringify({ type: "error", code: "AUTH_REQUIRED" }));
        ws.close();
        return;
      }
      ws.send("pong");
      return;
    }
    if (staffScopeBySocket.has(ws)) return;

    try {
      const payload = parseJsonMessage(message);
      if (!Value.Check(staffRealtimeAuthMessageSchema, payload))
        throw new Error("Invalid realtime auth payload");
      const tokenPayload = verifyAccessToken(payload.token);
      const tenantId = payload.tenantId;
      const branchId = payload.branchId;
      const context = await resolveRealtimeContext(
        tokenPayload,
        tenantId,
        branchId,
      );
      clearAuthTimer(ws);
      staffScopeBySocket.set(ws, {
        tenantId: context.tenantId,
        branchId: context.branchId,
      });
      addClient(context.tenantId, ws);
      staffConnectionCount += 1;
      metrics.setGauge("servora_websocket_connections", staffConnectionCount, {
        kind: "staff",
      });
      ws.send(
        JSON.stringify({ type: "connected", tenantId: context.tenantId }),
      );
    } catch {
      clearAuthTimer(ws);
      ws.send(JSON.stringify({ type: "error", code: "AUTH_INVALID_TOKEN" }));
      ws.close();
    }
  },

  close(ws) {
    clearAuthTimer(ws);
    const scope = staffScopeBySocket.get(ws);
    if (scope) {
      removeClient(scope.tenantId, ws);
      staffConnectionCount = Math.max(0, staffConnectionCount - 1);
      metrics.setGauge("servora_websocket_connections", staffConnectionCount, {
        kind: "staff",
      });
    }
    staffScopeBySocket.delete(ws);
  },
});

export const customerRealtimeRouter = new Elysia({ prefix: "/ws/customer" }).ws(
  "/events",
  {
    open(ws) {
      startAuthTimer(ws);
    },
    async message(ws, message) {
      if (message === "ping") {
        if (!customerSessionBySocket.has(ws)) {
          ws.send(JSON.stringify({ type: "error", code: "AUTH_REQUIRED" }));
          ws.close();
          return;
        }
        ws.send("pong");
        return;
      }
      if (customerSessionBySocket.has(ws)) return;

      try {
        const payload = parseJsonMessage(message);
        if (!Value.Check(customerRealtimeAuthMessageSchema, payload))
          throw new Error("Invalid customer realtime auth payload");
        const session = await customerService.getSession(payload.session);
        clearAuthTimer(ws);
        customerSessionBySocket.set(ws, session.id);
        customerScopeBySocket.set(ws, {
          tenantId: session.tenantId,
          branchId: session.branchId,
        });
        addCustomerClient(session.id, ws);
        addCustomerBranchClient(session.tenantId, session.branchId, ws);
        customerConnectionCount += 1;
        metrics.setGauge(
          "servora_websocket_connections",
          customerConnectionCount,
          { kind: "customer" },
        );
        ws.send(JSON.stringify({ type: "connected", sessionId: session.id }));
      } catch {
        clearAuthTimer(ws);
        ws.send(
          JSON.stringify({ type: "error", code: "CUSTOMER_SESSION_INVALID" }),
        );
        ws.close();
      }
    },
    close(ws) {
      clearAuthTimer(ws);
      const id = customerSessionBySocket.get(ws);
      const scope = customerScopeBySocket.get(ws);
      if (id) {
        removeCustomerClient(id, ws);
        customerConnectionCount = Math.max(0, customerConnectionCount - 1);
        metrics.setGauge(
          "servora_websocket_connections",
          customerConnectionCount,
          { kind: "customer" },
        );
      }
      if (scope) removeCustomerBranchClient(scope.tenantId, scope.branchId, ws);
      customerSessionBySocket.delete(ws);
      customerScopeBySocket.delete(ws);
    },
  },
);
