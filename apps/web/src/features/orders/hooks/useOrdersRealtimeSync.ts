import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { orderKeys } from "@/features/orders/query-keys";
import type { OrderDto as Order } from "@pos/api-client";
import type { RealtimeKitchenTicketPayload } from "@pos/realtime";

type KitchenTicketPatch = Pick<
  RealtimeKitchenTicketPayload,
  | "id"
  | "status"
  | "notes"
  | "courseId"
  | "course"
  | "firedAt"
  | "readyAt"
  | "servedAt"
  | "updatedAt"
>;

export const applyKitchenTicketUpdate = (
  order: Order,
  incoming: KitchenTicketPatch,
): Order => ({
  ...order,
  kitchenTickets: order.kitchenTickets.map((ticket) =>
    ticket.id === incoming.id
      ? {
          ...ticket,
          status: incoming.status,
          notes: incoming.notes,
          courseId: incoming.courseId,
          course: incoming.course ?? ticket.course,
          firedAt: incoming.firedAt,
          readyAt: incoming.readyAt,
          servedAt: incoming.servedAt,
          updatedAt: incoming.updatedAt,
        }
      : ticket,
  ),
  updatedAt: incoming.updatedAt,
});

const refreshOrder = (queryClient: QueryClient, order: { id: string }) => {
  void queryClient.invalidateQueries({ queryKey: orderKeys.detail(order.id) });
  // Page membership and totals can change on every order event. Refetching the
  // bounded pages is both safer and cheaper than mutating arbitrary cached pages.
  void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
};

export const useOrdersRealtimeSync = () => {
  const queryClient = useQueryClient();
  useRealtimeEvent("order.created", (event) =>
    refreshOrder(queryClient, event.payload),
  );
  useRealtimeEvent("order.updated", (event) =>
    refreshOrder(queryClient, event.payload),
  );

  useRealtimeEvent("kitchen.ticket.updated", (event) => {
    void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    queryClient.setQueryData<Order>(
      orderKeys.detail(event.payload.orderId),
      (current) => {
        if (!current?.kitchenTickets) return current;
        const existing = current.kitchenTickets.find(
          (ticket) => ticket.id === event.payload.id,
        );
        if (
          existing &&
          new Date(existing.updatedAt).getTime() >
            new Date(event.payload.updatedAt).getTime()
        )
          return current;
        return applyKitchenTicketUpdate(current, event.payload);
      },
    );
  });
};
