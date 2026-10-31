"use client";
import { Component, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
type DemoKey = "customer" | "waiter" | "kitchen" | "web";
const demos: [DemoKey, string, string, string][] = [
  [
    "customer",
    "Guest ordering",
    "Choose. Customize. Order.",
    "Browse a sample menu, change item choices and follow the order status. A QR session supplies the table context in the actual customer application.",
  ],
  [
    "waiter",
    "Waiter app",
    "The next table action.",
    "Move between ready orders, guest requests and menu ordering in the service team's focused workspace.",
  ],
  [
    "kitchen",
    "Kitchen display",
    "Work through the tickets.",
    "Start preparation and mark a ticket ready. In the actual kitchen application, station filters and ticket states organize the queue.",
  ],
  [
    "web",
    "Management & POS",
    "See the operation.",
    "Switch management areas, inspect orders and menu items, and explore branch context in the sample workspace.",
  ],
];
const DemoLoading = () => (
  <div className="demo-loading" role="status">
    Loading demonstration…
  </div>
);
const CustomerDemo = dynamic(
  () => import("./demos/CustomerDemo").then((m) => m.CustomerDemo),
  { loading: DemoLoading },
);
const WaiterDemo = dynamic(
  () => import("./demos/WaiterDemo").then((m) => m.WaiterDemo),
  { loading: DemoLoading },
);
const KitchenDemo = dynamic(
  () => import("./demos/KitchenDemo").then((m) => m.KitchenDemo),
  { loading: DemoLoading },
);
const WebDemo = dynamic(
  () => import("./demos/WebDemo").then((m) => m.WebDemo),
  { loading: DemoLoading },
);
class DemoBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="demo-loading" role="alert">
        <p>The demonstration could not load.</p>
        <button
          type="button"
          className="site-button"
          onClick={() => window.location.reload()}
        >
          Reload demonstration
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function InteractiveProductDemos() {
  const [active, setActive] = useState<DemoKey>("customer");
  const selected = demos.find((item) => item[0] === active)!;
  return (
    <section className="demo-section" id="interactive-demos">
      <header>
        <h2>Take a look inside.</h2>
        <p>
          Choose a workspace and try its controls. Each demonstration runs
          independently with illustrative sample data.
        </p>
      </header>
      <div
        className="demo-selector"
        role="group"
        aria-label="Choose an application demonstration"
      >
        {demos.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="demo-workbench">
        <div className="demo-description">
          <h3>{selected[2]}</h3>
          <p>{selected[3]}</p>
          <p>
            Sample restaurant: Olive &amp; Ember. No orders or payments are sent
            to a live restaurant.
          </p>
        </div>
        <div className="demo-canvas" data-ui>
          <DemoBoundary key={active}>
            {active === "customer" ? (
              <CustomerDemo />
            ) : active === "waiter" ? (
              <WaiterDemo />
            ) : active === "kitchen" ? (
              <KitchenDemo />
            ) : (
              <WebDemo />
            )}
          </DemoBoundary>
        </div>
      </div>
      <p className="demo-notice">
        Interactive sample · Local demonstration state · Values are illustrative
      </p>
    </section>
  );
}
