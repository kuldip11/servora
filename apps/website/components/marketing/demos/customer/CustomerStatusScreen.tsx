import { Check } from "lucide-react";

type CustomerStatusScreenProps = {
  serviceMessage: string | null;
  onServiceRequest: (label: string) => void;
};

export const CustomerStatusScreen = ({
  serviceMessage,
  onServiceRequest,
}: CustomerStatusScreenProps) => (
  <div className="h-full overflow-y-auto bg-gradient-to-b from-[#174e36] from-[43%] to-[#f6f2e8] to-[43%] px-3 pb-20 pt-9 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="px-2 text-white">
      <div className="flex justify-between text-[9px] font-bold">
        <span>TABLE 12 · ORDER #1048</span>
        <span className="rounded-full bg-white/15 px-2 py-1">● LIVE</span>
      </div>
      <h3 className="mt-5 font-serif text-2xl font-bold">It&apos;s cooking.</h3>
      <p className="mt-1 text-[10px] opacity-75">
        Your order is moving through the kitchen.
      </p>
    </div>

    <div className="mt-5 rounded-2xl bg-white p-4 shadow-xl">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[9px] text-[#6d756f]">Estimated ready</span>
          <strong className="block font-serif text-xl">12–18 min</strong>
        </div>
        <span className="text-[8px] text-[#6d756f]">Updated now</span>
      </div>
      <div className="mt-6 grid grid-cols-4 text-center text-[8px] font-bold">
        <div>
          <span className="mx-auto mb-2 grid size-6 place-items-center rounded-full bg-[#174e36] text-white">
            <Check size={11} />
          </span>
          Received
        </div>
        <div>
          <span className="mx-auto mb-2 grid size-6 place-items-center rounded-full bg-[#174e36] text-white">
            <Check size={11} />
          </span>
          Confirmed
        </div>
        <div>
          <span className="mx-auto mb-2 grid size-6 place-items-center rounded-full bg-[#174e36] text-white">
            •
          </span>
          Cooking
        </div>
        <div className="text-[#8b938d]">
          <span className="mx-auto mb-2 block size-6 rounded-full bg-[#ddd8cd]" />
          Ready
        </div>
      </div>
    </div>

    <div className="mt-3 rounded-2xl border border-[#ddd8cd] bg-white p-4">
      <div className="flex justify-between text-[10px] font-bold">
        <span>Current round · 2 items</span>
        <span className="text-[#e66a2c]">PREPARING</span>
      </div>
      <p className="mt-3 text-[9px] leading-5 text-[#6d756f]">
        Truffle mushroom pizza × 1
        <br />
        Garden mezze × 1
      </p>
    </div>

    <h4 className="mt-5 font-serif text-xl font-bold">Need anything?</h4>
    <div className="mt-2 grid grid-cols-3 gap-2">
      {["Call waiter", "Water", "Request bill"].map((label) => (
        <button
          key={label}
          type="button"
          onClick={() => onServiceRequest(label)}
          className="rounded-xl border border-[#ddd8cd] bg-white px-1 py-4 text-[9px] font-bold"
        >
          {label}
        </button>
      ))}
    </div>
    {serviceMessage && (
      <div
        role="status"
        className="mt-2 rounded-xl bg-[#e1eee5] px-3 py-2 text-center text-[9px] font-bold text-[#174e36]"
      >
        {serviceMessage}
      </div>
    )}
  </div>
);
