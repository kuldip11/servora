import { publisher, REDIS_CHANNELS } from "./redis";
import {
  realtimeEnvelopeSchema,
  type RealtimeEvent,
  type RealtimeEnvelope,
} from "@pos/contracts";
import { Value } from "@sinclair/typebox/value";

export interface EventPublishContext {
  userId?: string | undefined;
  requestId?: string | undefined;
  ipAddress?: string | undefined;
}

type EventType = RealtimeEvent["type"];
type EventOfType<T extends EventType> = Extract<RealtimeEvent, { type: T }>;
type LocalEventEnvelope<T extends EventType> = {
  event: EventOfType<T>;
  tenantId: string;
  branchId?: string;
  context?: EventPublishContext;
};
type LocalHandler = (
  envelope: LocalEventEnvelope<EventType>,
) => void | Promise<void>;

const localHandlers = new Map<EventType, Set<LocalHandler>>();

export const eventBus = {
  subscribe<T extends EventType>(
    type: T,
    handler: (envelope: LocalEventEnvelope<T>) => void | Promise<void>,
  ): () => void {
    const handlers = localHandlers.get(type) ?? new Set<LocalHandler>();
    const wrapped = handler as unknown as LocalHandler;
    handlers.add(wrapped);
    localHandlers.set(type, handlers);
    return () => {
      handlers.delete(wrapped);
      if (handlers.size === 0) localHandlers.delete(type);
    };
  },

  async publish(
    event: RealtimeEvent,
    tenantId: string,
    branchId?: string,
    context?: EventPublishContext,
  ): Promise<void> {
    const envelope: RealtimeEnvelope = {
      ...event,
      tenantId,
      ...(branchId ? { branchId } : {}),
      timestamp: new Date().toISOString(),
    };
    if (!Value.Check(realtimeEnvelopeSchema, envelope)) {
      throw new Error(`Invalid realtime payload for ${event.type}`);
    }
    const message = JSON.stringify(envelope);

    let channel: string;
    if (event.type.startsWith("order.")) {
      channel = REDIS_CHANNELS.ORDER_EVENTS;
    } else if (event.type.startsWith("kitchen.")) {
      channel = REDIS_CHANNELS.KITCHEN_EVENTS;
    } else if (
      event.type.startsWith("inventory.") ||
      event.type.startsWith("menu.")
    ) {
      channel = REDIS_CHANNELS.INVENTORY_EVENTS;
    } else if (event.type.startsWith("payment.")) {
      channel = REDIS_CHANNELS.ORDER_EVENTS;
    } else if (event.type.startsWith("table.")) {
      channel = REDIS_CHANNELS.TABLE_EVENTS;
    } else {
      channel = REDIS_CHANNELS.ORDER_EVENTS;
    }

    await publisher.publish(channel, message);

    const handlers = [...(localHandlers.get(event.type) ?? [])];
    for (const handler of handlers) {
      await handler({
        event,
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(context ? { context } : {}),
      });
    }
  },
};
