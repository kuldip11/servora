const orderValues = [1228, 1640, 920, 2180];
export function WebOverviewScreen({
  statuses,
}: {
  statuses: Record<string, string>;
}) {
  const active = Object.values(statuses).filter(
    (status) => status !== "Served",
  ).length;
  const ready = Object.values(statuses).filter(
    (status) => status === "Ready",
  ).length;
  return (
    <div className="mt-5">
      <div className="grid grid-cols-3 gap-3 bg-white p-4">
        {[
          ["Open orders", active],
          ["Ready now", ready],
          [
            "Order value",
            `₹${orderValues.reduce((sum, value) => sum + value, 0).toLocaleString("en-IN")}`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="block text-xs text-[#566052]">{label}</span>
            <strong className="mt-2 block text-xl font-semibold">
              {value}
            </strong>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-white p-4">
        <h4 className="text-base font-semibold">Service overview</h4>
        <p className="mt-2 text-xs text-[#566052]">
          Values reflect the four sample order records.
        </p>
        {Object.entries(statuses).map(([id, status]) => (
          <div
            key={id}
            className="flex justify-between gap-4 border-b border-[#e0e6dc] py-4 text-sm"
          >
            <strong>{id}</strong>
            <span>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
