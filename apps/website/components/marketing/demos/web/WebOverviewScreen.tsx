export const WebOverviewScreen = () => (
  <>
    <div className="mt-4 grid grid-cols-3 gap-2">
      {[
        ["Open orders", "18"],
        ["Ready now", "06"],
        ["Net sales", "₹42.8k"],
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-[#e0e5e1] bg-white p-3"
        >
          <span className="block text-[7px] text-[#6e7a72]">{label}</span>
          <strong className="mt-1 block text-base">{value}</strong>
        </div>
      ))}
    </div>
    <div className="mt-3 rounded-xl border border-[#e0e5e1] bg-white p-3">
      <div className="flex justify-between text-[9px] font-bold">
        <span>Order activity</span>
        <span className="text-[#23724d]">Updated now</span>
      </div>
      <div className="mt-5 flex h-28 items-end gap-2">
        {[35, 52, 42, 74, 60, 88, 70, 95, 78, 64].map((height, index) => (
          <span
            key={`${height}-${index}`}
            style={{ height: `${height}%` }}
            className={`flex-1 rounded-t ${index % 3 === 0 ? "bg-[#e96f35]" : "bg-[#b9d9c4]"}`}
          />
        ))}
      </div>
    </div>
  </>
);
