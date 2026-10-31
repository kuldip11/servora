import type { KitchenTicketUpdateStatus } from "@pos/api-client";

interface Props {
  next: KitchenTicketUpdateStatus | null;
  nextLabel: string | null;
  btnClass: string;
  isUpdating: boolean;
  onAdvance: () => void;
}

export const TicketFooter = ({
  next,
  nextLabel,
  btnClass,
  isUpdating,
  onAdvance,
}: Props) => {
  if (!next) {
    return (
      <p className="text-center text-xs text-text-secondary py-2">
        Waiting for waiter to serve
      </p>
    );
  }

  return (
    <button
      onClick={onAdvance}
      disabled={isUpdating}
      className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${btnClass}`}
    >
      {nextLabel}
    </button>
  );
};
