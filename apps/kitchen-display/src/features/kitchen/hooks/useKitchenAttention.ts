import { useEffect, useRef } from "react";
import { toast } from "@pos/ui";
import { useRealtimeEvent } from "@/shared/lib/realtime";
import { filterTicketForStation } from "@/features/kitchen/utils/ticket";
import { getVoidAlertsEnabled } from "@/features/kitchen/terminal-storage";

export const useKitchenAttention = (stationId?: string) => {
  const initialized = useRef(false);
  useEffect(() => {
    initialized.current = true;
    return () => {
      initialized.current = false;
    };
  }, []);
  useRealtimeEvent("kitchen.ticket.created", (event) => {
    if (!initialized.current) return;
    const ticket = filterTicketForStation(event.payload, stationId);
    if (!ticket || ticket.status === "HELD") return;
    const table = ticket.order?.table?.name;
    toast({
      title: table ? `New ticket · Table ${table}` : "New kitchen ticket",
      tone: "info",
      duration: 3000,
    });
  });
  useRealtimeEvent("order.item.voided", (event) => {
    if (!initialized.current || !getVoidAlertsEnabled()) return;
    const ticket = filterTicketForStation(event.payload, stationId);
    if (!ticket) return;
    const inProgress =
      ticket.status === "PREPARING" || ticket.status === "READY";
    toast({
      title: inProgress
        ? "URGENT VOID · stop preparation"
        : "Item voided before preparation",
      tone: inProgress ? "danger" : "warning",
      duration: 6000,
    });
  });
};
