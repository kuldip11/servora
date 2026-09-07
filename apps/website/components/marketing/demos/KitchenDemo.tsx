"use client";

import { useState } from "react";

type TicketStatus = "NEW" | "PREPARING" | "READY";
const initialTickets: Array<{
  id: string;
  table: string;
  time: string;
  status: TicketStatus;
  items: string[];
}> = [
  {
    id: "1048",
    table: "T12",
    time: "04:18",
    status: "NEW",
    items: ["1 × Truffle pizza", "Large · Extra mushroom", "1 × Berry cooler"],
  },
  {
    id: "1047",
    table: "T08",
    time: "08:42",
    status: "PREPARING",
    items: ["2 × Paneer bowl", "No onion", "1 × Garden mezze"],
  },
  {
    id: "1046",
    table: "TAKEAWAY",
    time: "12:07",
    status: "READY",
    items: ["1 × Truffle pizza", "1 × Garden mezze"],
  },
];

export const KitchenDemo = () => {
  const [tickets, setTickets] = useState(initialTickets);
  const advance = (id: string) =>
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === id
          ? {
              ...ticket,
              status: ticket.status === "NEW" ? "PREPARING" : "READY",
            }
          : ticket,
      ),
    );
  return (
    <div className="overflow-hidden rounded-2xl border-[5px] border-[#101713] bg-[#151d18] text-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#9ab0a1]">
            Kitchen display
          </p>
          <strong className="text-sm">Dinner service</strong>
        </div>
        <div className="flex gap-2 text-[9px]">
          <span className="rounded-full bg-white/10 px-2 py-1">
            {tickets.filter((t) => t.status !== "READY").length} active
          </span>
          <button
            type="button"
            onClick={() => setTickets(initialTickets)}
            className="rounded-full bg-white/10 px-2 py-1"
          >
            Reset demo
          </button>
        </div>
      </header>
      <div className="grid min-h-[390px] gap-3 p-3 md:grid-cols-3">
        {tickets.map((ticket) => (
          <article
            key={ticket.id}
            className="self-start overflow-hidden rounded-xl bg-[#fffdf8] text-[#172019]"
          >
            <header
              className={`flex justify-between px-3 py-2 text-[10px] font-black ${ticket.status === "NEW" ? "bg-[#f0b94f]" : ticket.status === "PREPARING" ? "bg-[#e96f35] text-white" : "bg-[#78b991]"}`}
            >
              <span>
                #{ticket.id} · {ticket.table}
              </span>
              <span>{ticket.time}</span>
            </header>
            <div className="p-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#6d756f]">
                {ticket.status}
              </p>
              <div className="mt-2 space-y-1 text-[10px] leading-5">
                {ticket.items.map((item, index) => (
                  <p
                    key={`${item}-${index}`}
                    className={index === 1 ? "pl-3 text-[#b6592e]" : ""}
                  >
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={ticket.status === "READY"}
              onClick={() => advance(ticket.id)}
              className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-lg bg-[#172019] py-2 text-[9px] font-bold text-white disabled:bg-[#d8ded9] disabled:text-[#5d6862]"
            >
              {ticket.status === "NEW"
                ? "Start preparing"
                : ticket.status === "PREPARING"
                  ? "Mark ready"
                  : "Ready for pickup"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};
