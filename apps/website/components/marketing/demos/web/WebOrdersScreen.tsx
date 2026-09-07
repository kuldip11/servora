type Props = {
  statuses: Record<string, string>;
  onAdvance: (id: string, nextStatus: string, currentStatus: string) => void;
};

const orders = [
  ["#1048", "Table 12", "₹1,228"],
  ["#1047", "Table 08", "₹1,640"],
  ["#1046", "Takeaway", "₹920"],
  ["#1045", "Table 03", "₹2,180"],
] as const;

export const WebOrdersScreen = ({ statuses, onAdvance }: Props) => (
  <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe6e1] bg-white">
    {orders.map(([id, tableLabel, total]) => {
      const status = statuses[id] ?? "Preparing";
      const nextStatus =
        status === "Preparing"
          ? "Ready"
          : status === "Ready"
            ? "Served"
            : status;
      return (
        <button
          type="button"
          key={id}
          onClick={() => onAdvance(id, nextStatus, status)}
          className="grid w-full grid-cols-4 gap-2 border-b border-[#e8ece9] p-3 text-left text-[8px] last:border-0 hover:bg-[#f6faf7]"
        >
          <strong>{id}</strong>
          <span>{tableLabel}</span>
          <span
            className={status === "Ready" ? "font-bold text-[#23724d]" : ""}
          >
            {status}
          </span>
          <span className="text-right">{total}</span>
        </button>
      );
    })}
  </div>
);
