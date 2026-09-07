import { ReceiptText } from "lucide-react";
import { IconButton, SearchInput } from "@pos/ui";
import type { CustomerMenuSessionView } from "../CustomerMenuView";

type CustomerMenuHeaderProps = {
  session: CustomerMenuSessionView;
  placedOrder: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onViewOrder: () => void;
};

export const CustomerMenuHeader = ({
  session,
  placedOrder,
  search,
  onSearchChange,
  onViewOrder,
}: CustomerMenuHeaderProps) => (
  <header className="bg-[#174d34] text-white">
    <div className="mx-auto max-w-5xl px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pb-7 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 pt-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
            Welcome to
          </p>
          <h1 className="customer-display mt-1 truncate text-[2rem] font-bold leading-none sm:text-4xl">
            {session.restaurant}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {session.mode === "DINE_IN"
              ? "Good to have you — order whenever you're ready."
              : "Order ahead and we'll have it ready for pickup."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {placedOrder && (
            <IconButton
              aria-label="View live order status"
              icon={ReceiptText}
              size="lg"
              onClick={onViewOrder}
              className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
            />
          )}
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white">
            {session.mode === "DINE_IN"
              ? `Table ${session.table ?? "—"}`
              : "Takeaway"}
          </div>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_rgba(4,25,14,0.25)] [&_input]:bg-white [&_input]:text-[#17251d] [&_input]:placeholder:text-[#7d8780]">
        <SearchInput
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange("")}
          placeholder="Search dishes, drinks or ingredients"
          aria-label="Search the menu"
          className="border-0"
        />
      </div>
    </div>
  </header>
);
