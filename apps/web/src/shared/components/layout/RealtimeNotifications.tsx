import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "@pos/ui";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { menuKeys } from "@/features/menu/query-keys";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { inventoryKeys } from "@/features/inventory/query-keys";

export const RealtimeNotifications = () => {
  const queryClient = useQueryClient();
  const seen = useRef(new Set<string>());

  useEffect(() => () => seen.current.clear(), []);

  useRealtimeEvent("inventory.low_stock", (event) => {
    const key = `stock:${event.payload.id}:${event.payload.currentStock}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    toast({
      title: `Low stock · ${event.payload.name}`,
      tone: "warning",
      duration: 4500,
    });
  });

  useRealtimeEvent("menu.availability.updated", () => {
    void queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    void queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard() });
    void queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
  });

  useRealtimeEvent("customer.request.created", (event) => {
    const key = `request:${event.payload.id}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    toast({
      title: `Customer request · ${String(event.payload.type).replace(/_/g, " ").toLowerCase()}`,
      tone: "info",
      duration: 4000,
    });
  });

  useRealtimeEvent("payment.updated", (event) => {
    if (event.payload.status !== "FAILED") return;
    const key = `payment:${event.payload.paymentId}:${event.payload.status}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    toast({
      title: "Payment failed — review the order",
      tone: "danger",
      duration: 5000,
    });
  });

  return null;
};
