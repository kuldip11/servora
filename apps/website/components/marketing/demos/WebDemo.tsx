"use client";

import { useMemo, useState } from "react";

import { WebBusinessScreen } from "./web/WebBusinessScreen";
import { WebMenuScreen } from "./web/WebMenuScreen";
import { WebOrdersScreen } from "./web/WebOrdersScreen";
import { WebOverviewScreen } from "./web/WebOverviewScreen";

type Section = "overview" | "business" | "orders" | "menu";

const sectionMeta: Record<Section, { title: string; subtitle: string }> = {
  overview: { title: "Today at a glance", subtitle: "Connaught Place · Live" },
  business: { title: "Business structure", subtitle: "Olive & Ember Group" },
  orders: { title: "Order operations", subtitle: "18 open orders" },
  menu: { title: "Menu management", subtitle: "146 active items" },
};

export const WebDemo = () => {
  const [section, setSection] = useState<Section>("overview");
  const [notice, setNotice] = useState<string | null>(null);
  const [franchiseCreated, setFranchiseCreated] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string | null>(null);
  const [branch, setBranch] = useState("All branches");
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({
    "#1048": "Preparing",
    "#1047": "Ready",
    "#1046": "Payment required",
    "#1045": "Served",
  });
  const content = useMemo(() => sectionMeta[section], [section]);

  const advanceOrder = (
    id: string,
    nextStatus: string,
    currentStatus: string,
  ) => {
    setOrderStatuses((current) => ({ ...current, [id]: nextStatus }));
    setNotice(
      nextStatus === currentStatus
        ? `${id} opened`
        : `${id} moved to ${nextStatus}`,
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border-[5px] border-[#172019] bg-[#f8faf8] text-[#172019] shadow-2xl">
      {notice && (
        <div
          role="status"
          className="absolute right-3 top-12 z-20 flex items-center gap-2 rounded-lg bg-[#172019] px-3 py-2 text-[8px] font-bold text-white shadow-lg"
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
      <header className="flex items-center justify-between border-b border-[#dfe6e1] px-4 py-3 text-[10px] font-bold">
        <span>servora · Olive & Ember</span>
        <select
          aria-label="Branch"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
          className="rounded-md bg-transparent text-[#6e7a72] outline-none"
        >
          <option>All branches</option>
          <option>Connaught Place</option>
          <option>South Delhi</option>
        </select>
      </header>
      <div className="grid min-h-[390px] grid-cols-[96px_1fr] sm:grid-cols-[130px_1fr]">
        <aside className="border-r border-[#dfe6e1] bg-[#f1f5f2] p-2">
          {(
            [
              ["overview", "Overview"],
              ["business", "Business"],
              ["orders", "Orders"],
              ["menu", "Menu"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-[9px] font-bold ${section === key ? "bg-[#dfeee4] text-[#174e36]" : "text-[#738078]"}`}
            >
              {label}
            </button>
          ))}
        </aside>
        <main className="min-w-0 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#23724d]">
                Management & POS
              </p>
              <h3 className="mt-1 text-lg font-bold">{content.title}</h3>
            </div>
            <span className="text-[8px] text-[#6e7a72]">
              {content.subtitle}
            </span>
          </div>
          {section === "overview" && <WebOverviewScreen />}
          {section === "business" && (
            <WebBusinessScreen
              franchiseCreated={franchiseCreated}
              onFranchiseCreate={() => {
                setFranchiseCreated(true);
                setNotice("North Region Franchise created");
              }}
              onNotice={setNotice}
            />
          )}
          {section === "orders" && (
            <WebOrdersScreen
              statuses={orderStatuses}
              onAdvance={advanceOrder}
            />
          )}
          {section === "menu" && (
            <WebMenuScreen
              selectedItem={selectedMenuItem}
              onSelect={(name) => {
                setSelectedMenuItem(name);
                setNotice(`${name} selected for editing`);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};
