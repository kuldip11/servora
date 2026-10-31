export const shouldApplyRealtime = (
  current?: { updatedAt?: string } | null,
  incoming?: { updatedAt?: string } | null,
) => {
  if (!current?.updatedAt || !incoming?.updatedAt) return true;
  return (
    new Date(incoming.updatedAt).getTime() >=
    new Date(current.updatedAt).getTime()
  );
};

interface RealtimeTicketPatch {
  id: string;
  status:
    "PENDING_PAYMENT" | "FIRED" | "PREPARING" | "READY" | "SERVED" | "HELD";
  notes: string | null;
  courseId: string | null;
  course?: {
    id: string;
    orderId: string;
    courseNumber: number;
    name: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  firedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  updatedAt: string;
}

export const mergeRealtimeTicket = <T extends RealtimeTicketPatch>(
  tickets: T[],
  incoming: RealtimeTicketPatch,
): T[] =>
  tickets.map((ticket) =>
    ticket.id === incoming.id && shouldApplyRealtime(ticket, incoming)
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
  );
