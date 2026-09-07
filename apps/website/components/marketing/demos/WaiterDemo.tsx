"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export const WaiterDemo = () => {
  const [screen, setScreen] = useState<"home" | "orders" | "new-order">("home");
  const [orderFilter, setOrderFilter] = useState("Ready 3");
  const [table, setTable] = useState(8);
  const [cartItems, setCartItems] = useState(3);
  const [cartTotal, setCartTotal] = useState(820);
  const [notice, setNotice] = useState<string | null>(null);
  const [menuCategory, setMenuCategory] = useState("Popular");
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div
        role="tablist"
        aria-label="Waiter demo screens"
        className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-[#e8ece8] p-1"
      >
        {(
          [
            ["home", "Home"],
            ["orders", "Orders"],
            ["new-order", "New order"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={screen === key}
            onClick={() => setScreen(key)}
            className={`rounded-lg py-2 text-[10px] font-bold ${screen === key ? "bg-white text-[#174e36] shadow-sm" : "text-[#657068]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative h-[520px] overflow-hidden rounded-[30px] border-[6px] border-[#172019] bg-[#f5f7f5] text-[#172019] shadow-2xl">
        {notice && (
          <div
            role="status"
            className="absolute inset-x-3 top-3 z-20 flex items-center justify-between rounded-xl bg-[#172019] px-3 py-2 text-[9px] font-bold text-white shadow-lg"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
        )}
        <header className="flex items-center justify-between bg-white px-4 pb-3 pt-8">
          <div>
            <p className="text-[9px] text-[#6d756f]">Olive & Ember</p>
            <strong className="text-sm">Connaught Place</strong>
          </div>
          <span className="grid size-9 place-items-center rounded-full bg-[#e5f4ea] text-[10px] font-bold text-[#197341]">
            AK
          </span>
        </header>
        <main className="h-[410px] overflow-y-auto px-3 pb-20 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {screen === "home" && (
            <>
              <div className="rounded-2xl bg-[#174e36] p-4 text-white">
                <p className="text-[9px] opacity-70">DINNER SERVICE</p>
                <h3 className="mt-1 text-xl font-semibold">
                  Good evening, Arjun.
                </h3>
                <p className="mt-1 text-[10px] opacity-75">
                  3 orders are ready to serve.
                </p>
                <button
                  type="button"
                  onClick={() => setScreen("orders")}
                  className="mt-4 rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-[#174e36]"
                >
                  View ready orders
                </button>
              </div>
              <h4 className="mt-5 text-sm font-bold">Needs attention</h4>
              {[
                ["T12", "Ready to serve", "#1048 · 4 items"],
                ["T07", "Water requested", "2 guests"],
                ["T04", "Bill requested", "₹1,840 · 6 guests"],
              ].map(([table, status, meta], index) => (
                <div
                  key={table}
                  className="mt-2 grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-xl border border-[#d9dfdb] bg-white p-3"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-[#edf3ef] text-xs font-bold">
                    {table}
                  </span>
                  <span>
                    <strong
                      className={`block text-[10px] ${index === 0 ? "text-[#197341]" : index === 2 ? "text-[#b6592e]" : ""}`}
                    >
                      {status}
                    </strong>
                    <span className="text-[8px] text-[#6d756f]">{meta}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotice(`${table} details opened`)}
                    className="rounded-lg bg-[#e8efe9] px-2 py-1.5 text-[8px] font-bold"
                  >
                    Open
                  </button>
                </div>
              ))}
            </>
          )}
          {screen === "orders" && (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#197341]">
                    Service queue
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">Orders</h3>
                </div>
                <span className="text-[9px] text-[#6d756f]">8 active</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#e9eeeb] p-1">
                {["Ready 3", "Active 5", "All"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setOrderFilter(label)}
                    className={`rounded-lg py-2 text-[9px] font-bold ${orderFilter === label ? "bg-white text-[#197341] shadow-sm" : "text-[#6d756f]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {[
                ["T12", "Ready to serve", "#1048 · 18 min", "Serve"],
                ["T03", "Preparing", "#1046 · 12 min", "View"],
                ["T09", "New order", "#1049 · 3 min", "View"],
                ["TA", "Payment required", "#1041 · ₹920", "Open"],
              ]
                .filter(([, status]) =>
                  orderFilter === "Ready 3"
                    ? status === "Ready to serve"
                    : true,
                )
                .map(([table, status, meta, action], index) => (
                  <div
                    key={table}
                    className="mt-2 grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-xl border border-[#d9dfdb] bg-white p-3"
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-[#edf3ef] text-xs font-bold">
                      {table}
                    </span>
                    <span>
                      <strong
                        className={`block text-[10px] ${index === 0 ? "text-[#197341]" : ""}`}
                      >
                        {status}
                      </strong>
                      <span className="text-[8px] text-[#6d756f]">{meta}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotice(`${action}: ${table} selected`)}
                      className={`rounded-lg px-2 py-1.5 text-[8px] font-bold ${index === 0 ? "bg-[#174e36] text-white" : "bg-[#e8efe9]"}`}
                    >
                      {action}
                    </button>
                  </div>
                ))}
            </>
          )}
          {screen === "new-order" && (
            <>
              <div className="flex items-center justify-between rounded-xl bg-[#e5f4ea] p-3">
                <div>
                  <strong className="block text-xs">Table {table}</strong>
                  <span className="text-[8px] text-[#6d756f]">
                    3 guests · Dine in
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTable((value) => (value === 8 ? 10 : 8))}
                  className="text-[9px] font-bold text-[#197341]"
                >
                  Change
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#d9dfdb] bg-white px-3 py-2.5 text-[9px] text-[#6d756f]">
                <Search size={12} /> Search dishes or scan code
              </div>
              <div className="mt-3 flex gap-1.5 overflow-hidden">
                {["Popular", "Starters", "Mains", "Drinks"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={menuCategory === label}
                    onClick={() => setMenuCategory(label)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[8px] font-bold ${menuCategory === label ? "bg-[#174e36] text-white" : "border border-[#d9dfdb] bg-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[8px] font-bold text-[#197341]">
                Browsing: {menuCategory}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["Butter Chicken", "₹420", "from-[#edca7e] to-[#c66f31]"],
                  ["Paneer Tikka", "₹310", "from-[#dce6bd] to-[#789756]"],
                  ["Dal Makhani", "₹280", "from-[#d8bddf] to-[#8a5b98]"],
                  ["Garlic Naan", "₹90", "from-[#edd49b] to-[#b66c36]"],
                ].map(([name, price, gradient]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setCartItems((value) => value + 1);
                      setCartTotal(
                        (value) => value + Number(price.replace(/\D/g, "")),
                      );
                      setNotice(`${name} added to the order`);
                    }}
                    className="overflow-hidden rounded-xl border border-[#d9dfdb] bg-white p-2 text-left"
                  >
                    <span
                      className={`block h-16 rounded-lg bg-gradient-to-br ${gradient}`}
                    />
                    <strong className="mt-2 block text-[9px]">{name}</strong>
                    <span className="mt-1 flex justify-between text-[8px] text-[#6d756f]">
                      <span>{price}</span>
                      <b className="text-[#197341]">+ Add</b>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNotice("Order review opened")}
                className="sticky bottom-1 mt-3 flex w-full justify-between rounded-xl bg-[#174e36] px-4 py-3 text-[10px] font-bold text-white"
              >
                <span>
                  {cartItems} items · ₹{cartTotal}
                </span>
                <span>Review order →</span>
              </button>
            </>
          )}
        </main>
        <nav className="absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-[#d9dfdb] bg-white px-2 pb-3 pt-2">
          {(
            [
              ["home", "Home"],
              ["orders", "Orders"],
              ["new-order", "New order"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScreen(key)}
              className={`py-1 text-[9px] font-bold ${screen === key ? "text-[#197341]" : "text-[#6d756f]"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
