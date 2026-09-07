import { BellRing, Droplets, ReceiptText, UtensilsCrossed } from "lucide-react";
import type { CustomerRequestType } from "@/api";
const requests = [
  { type: "CALL_WAITER", label: "Call waiter", icon: BellRing },
  { type: "WATER", label: "Water", icon: Droplets },
  { type: "CUTLERY", label: "Cutlery", icon: UtensilsCrossed },
  { type: "BILL", label: "Request bill", icon: ReceiptText },
] as const;
export const ServiceRequests = ({
  mode,
  onRequest,
  busy,
  message,
}: {
  mode: "DINE_IN" | "TAKEAWAY";
  onRequest: (type: CustomerRequestType) => void;
  busy: boolean;
  message: string | null;
}) => (
  <section id="customer-service" className="scroll-mt-4 pt-7">
    <div className="mb-3 flex items-end justify-between">
      <h2 className="customer-display text-2xl font-bold">Need anything?</h2>
      <span className="text-xs text-text-secondary">We'll notify the team</span>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {requests
        .filter(({ type }) => mode === "DINE_IN" || type !== "BILL")
        .map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            disabled={busy}
            onClick={() => onRequest(type)}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 text-xs font-bold transition hover:border-primary/40 hover:bg-primary-surface disabled:opacity-50"
          >
            <Icon className="h-5 w-5 text-primary" />
            {label}
          </button>
        ))}
    </div>
    {message && (
      <p
        role="status"
        className="mt-3 rounded-2xl bg-primary-surface px-4 py-3 text-sm text-primary"
      >
        {message}
      </p>
    )}
  </section>
);
