"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Check } from "lucide-react";

type DemoKey = "customer" | "waiter" | "kitchen" | "web";

const demos: Array<{
  key: DemoKey;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
}> = [
  {
    key: "customer",
    label: "Customer ordering",
    eyebrow: "Guest experience",
    title: "Browse, customize and order without waiting.",
    description:
      "A branded, table-aware mobile experience that carries guests from menu discovery to live order updates.",
    points: [
      "QR session and table context",
      "Variants, modifiers and editable cart",
      "Live status and service requests",
    ],
  },
  {
    key: "waiter",
    label: "Waiter app",
    eyebrow: "Front of house",
    title: "Take orders quickly on mobile or tablet.",
    description:
      "A focused workspace for ready orders, customer requests, tables and fast menu ordering.",
    points: [
      "Ready orders and table attention",
      "Mobile and tablet ordering layouts",
      "Edit choices before sending",
    ],
  },
  {
    key: "kitchen",
    label: "Kitchen display",
    eyebrow: "Kitchen operations",
    title: "See what to cook next without the noise.",
    description:
      "A high-contrast ticket board that keeps timing, modifiers and preparation progress easy to scan.",
    points: [
      "Live ticket priority and elapsed time",
      "Item modifiers and preparation notes",
      "Ready signals shared with service",
    ],
  },
  {
    key: "web",
    label: "Management & POS",
    eyebrow: "Business control",
    title: "Run every branch from one clear workspace.",
    description:
      "Manage the business hierarchy, menus, orders, inventory, staff, billing and operational insight.",
    points: [
      "Business, franchise and branch context",
      "Role-aware operational access",
      "Orders, sales and branch-level signals",
    ],
  },
];

const DemoLoading = () => (
  <div className="grid min-h-[520px] place-items-center rounded-[30px] border border-[#d6ddd7] bg-white/60 text-sm font-semibold text-[#657068]">
    Loading interactive demo…
  </div>
);

const CustomerDemo = dynamic(
  () => import("./demos/CustomerDemo").then((module) => module.CustomerDemo),
  { loading: DemoLoading },
);
const WaiterDemo = dynamic(
  () => import("./demos/WaiterDemo").then((module) => module.WaiterDemo),
  { loading: DemoLoading },
);
const KitchenDemo = dynamic(
  () => import("./demos/KitchenDemo").then((module) => module.KitchenDemo),
  { loading: DemoLoading },
);
const WebDemo = dynamic(
  () => import("./demos/WebDemo").then((module) => module.WebDemo),
  { loading: DemoLoading },
);

const DemoButton = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`rounded-xl px-3 py-3 text-sm font-semibold transition sm:px-4 ${
      active
        ? "bg-white text-[#142219] shadow-sm"
        : "text-[#68736b] hover:bg-white/60 hover:text-[#142219]"
    }`}
  >
    {children}
  </button>
);

export const InteractiveProductDemos = () => {
  const [active, setActive] = useState<DemoKey>("customer");
  const selected = demos.find((demo) => demo.key === active) ?? demos[0]!;

  return (
    <section id="interactive-demos" className="bg-[#f6f2e8] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#23724d]">
              Try the connected product
            </p>
            <h2 className="mt-3 max-w-xl font-serif text-4xl font-bold tracking-[-0.03em] text-[#142219] sm:text-5xl">
              Four experiences. One shared operation.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#657068] sm:text-base">
            Place an order as a guest, manage it as a waiter, progress it
            through the kitchen, then inspect the operational result in the
            management workspace.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-[#dcd8cd] bg-[#fffdf8] shadow-[0_24px_70px_rgba(27,48,34,0.12)]">
          <div
            role="tablist"
            aria-label="Interactive Servora application demos"
            className="grid grid-cols-2 gap-1 border-b border-[#dcd8cd] bg-[#eee9de] p-2 lg:grid-cols-4"
          >
            {demos.map((demo) => (
              <DemoButton
                key={demo.key}
                active={active === demo.key}
                onClick={() => setActive(demo.key)}
              >
                {demo.label}
              </DemoButton>
            ))}
          </div>
          <div className="grid lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-[#dcd8cd] p-7 lg:border-b-0 lg:border-r lg:p-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e96f35]">
                {selected.eyebrow}
              </p>
              <h3 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-[-0.025em] text-[#142219]">
                {selected.title}
              </h3>
              <p className="mt-4 text-sm leading-6 text-[#657068]">
                {selected.description}
              </p>
              <ul className="mt-7 space-y-3">
                {selected.points.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 text-sm font-semibold text-[#26372c]"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#174e36] text-white">
                      <Check size={12} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </aside>
            <div className="min-w-0 bg-[#e8eee9] p-4 sm:p-8 lg:p-10">
              {active === "customer" && <CustomerDemo />}
              {active === "waiter" && <WaiterDemo />}
              {active === "kitchen" && <KitchenDemo />}
              {active === "web" && <WebDemo />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
