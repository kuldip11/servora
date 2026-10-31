import type { ReactNode } from "react";

export type SurfaceKind =
  | "management"
  | "kitchen"
  | "waiter"
  | "customer"
  | "inventory"
  | "menu"
  | "billing"
  | "access"
  | "branches"
  | "analytics";
const orders = [
  {
    id: "1048",
    table: "Table 12",
    items: "Pizza · Garden mezze",
    status: "Preparing",
    amount: 940,
  },
  {
    id: "1047",
    table: "Table 08",
    items: "Paneer bowl · Garden mezze",
    status: "Ready",
    amount: 760,
  },
  {
    id: "1046",
    table: "Takeaway",
    items: "Garden mezze",
    status: "New",
    amount: 380,
  },
];
const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div data-ui className="product-surface">
      <div className="surface-toolbar">
        <strong>servora</strong>
        <span>{title}</span>
      </div>
      {children}
      <p className="surface-caption">Illustrative product view · Sample data</p>
    </div>
  );
}

export function ProductSurface({
  kind = "management",
}: {
  kind?: SurfaceKind;
}) {
  if (kind === "kitchen")
    return (
      <Frame title="Kitchen · Grill station">
        <div className="surface-kitchen">
          <div className="surface-section-title">
            <strong>On the pass</strong>
            <span>New → Preparing → Ready</span>
          </div>
          <div className="ticket-grid">
            {orders.slice(0, 2).map((order) => (
              <article className="kitchen-ticket" key={order.id}>
                <div className="ticket-heading">
                  <strong>{order.table}</strong>
                  <span>#{order.id}</span>
                </div>
                <p className="surface-status">{order.status}</p>
                <p>1 × Truffle mushroom pizza</p>
                <p className="surface-muted">Regular · No extra toppings</p>
                <p>1 × Garden mezze</p>
                <span className="ticket-action">
                  {order.status === "Ready"
                    ? "Ready for service"
                    : "Preparation in progress"}
                </span>
              </article>
            ))}
          </div>
        </div>
      </Frame>
    );
  if (kind === "customer")
    return (
      <Frame title="Guest ordering">
        <div className="guest-menu">
          <div>
            <strong>Table 12</strong>
            <h3>What looks good?</h3>
            <p>Browse the menu. Make it yours.</p>
          </div>
          <div className="menu-dish">
            <span>For sharing</span>
            <h4>Truffle mushroom pizza</h4>
            <p>Roasted mushrooms · Mozzarella</p>
            <strong>{money(560)}</strong>
          </div>
          <div className="menu-dish">
            <h4>Garden mezze</h4>
            <p>Hummus · Labneh · Warm pita</p>
            <strong>{money(380)}</strong>
          </div>
          <span className="surface-action">View your order</span>
        </div>
      </Frame>
    );
  if (kind === "waiter")
    return (
      <Frame title="Service · Main floor">
        <div className="surface-content">
          <div className="surface-section-title">
            <strong>Needs attention</strong>
            <span>3 tables</span>
          </div>
          {[
            ["Table 12", "Order ready", "Collect from the pass"],
            ["Table 07", "Water requested", "Guest request"],
            ["Table 04", "Bill requested", "Review the order"],
          ].map(([table, title, text]) => (
            <div className="service-row" key={table}>
              <strong>{table}</strong>
              <div>
                <b>{title}</b>
                <p>{text}</p>
              </div>
              <span>Open</span>
            </div>
          ))}
        </div>
      </Frame>
    );
  if (kind === "billing")
    return (
      <Frame title="Billing · Table 12">
        <div className="surface-content">
          <div className="surface-section-title">
            <strong>Bill details</strong>
            <span>2 items</span>
          </div>
          {[
            ["Truffle mushroom pizza", 560],
            ["Garden mezze", 380],
          ].map(([name, value]) => (
            <div className="data-row" key={name}>
              <span>{name}</span>
              <strong>{money(Number(value))}</strong>
            </div>
          ))}
          <div className="data-row">
            <span>Subtotal</span>
            <strong>{money(940)}</strong>
          </div>
          <div className="data-row">
            <span>Tax · 5% sample rate</span>
            <strong>{money(47)}</strong>
          </div>
          <div className="bill-total">
            <span>Total</span>
            <strong>{money(987)}</strong>
          </div>
          <div className="surface-options">
            <span>Split equally</span>
            <span>By item</span>
            <span>By seat</span>
          </div>
        </div>
      </Frame>
    );
  if (kind === "inventory" || kind === "menu")
    return (
      <Frame
        title={
          kind === "inventory" ? "Inventory · Ingredients" : "Menu · Main menu"
        }
      >
        <div className="surface-content">
          <div className="surface-section-title">
            <strong>
              {kind === "inventory" ? "Stock & recipes" : "Your menu"}
            </strong>
            <span>Current branch</span>
          </div>
          {(kind === "inventory"
            ? [
                ["Mozzarella", "12.5 kg", "Recipe linked"],
                ["Mushrooms", "4.0 kg", "Recipe linked"],
                ["Pizza flour", "18.0 kg", "In stock"],
              ]
            : [
                ["Truffle mushroom pizza", "₹560.00", "Available"],
                ["Garden mezze", "₹380.00", "Available"],
                ["Berry cooler", "₹210.00", "Unavailable"],
              ]
          ).map(([name, value, status]) => (
            <div className="data-row" key={name}>
              <div>
                <strong>{name}</strong>
                <p>{status}</p>
              </div>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </Frame>
    );
  if (kind === "branches" || kind === "access")
    return (
      <Frame
        title={
          kind === "access"
            ? "Staff · Access control"
            : "Organization · Branches"
        }
      >
        <div className="surface-content">
          <div className="surface-section-title">
            <strong>
              {kind === "access" ? "The right access" : "One organization"}
            </strong>
            <span>Branch context</span>
          </div>
          {(kind === "access"
            ? [
                ["Manager", "Branch operations"],
                ["Cashier", "Orders & billing"],
                ["Kitchen team", "Kitchen tickets"],
                ["Waiter", "Tables & service"],
              ]
            : [
                ["Central restaurant", "Main menu · Dine-in"],
                ["Riverside restaurant", "Branch availability"],
                ["Market restaurant", "Branch staff & reports"],
              ]
          ).map(([name, detail]) => (
            <div className="data-row" key={name}>
              <strong>{name}</strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </Frame>
    );
  return (
    <Frame
      title={
        kind === "analytics"
          ? "Reports · Order overview"
          : "Management · Orders"
      }
    >
      <div className="management-surface">
        <aside>
          <span>Overview</span>
          <strong>Orders</strong>
          <span>Menu</span>
          <span>Inventory</span>
          <span>Staff</span>
          <span>Reports</span>
        </aside>
        <div className="surface-content">
          <div className="surface-section-title">
            <strong>
              {kind === "analytics" ? "Order breakdown" : "Order operations"}
            </strong>
            <span>{orders.length} sample orders</span>
          </div>
          <div className="surface-stats">
            <div>
              <span>Orders shown</span>
              <b>{orders.length}</b>
            </div>
            <div>
              <span>Order value</span>
              <b>
                {money(orders.reduce((sum, order) => sum + order.amount, 0))}
              </b>
            </div>
          </div>
          <div
            className="order-table"
            role="table"
            aria-label="Sample restaurant orders"
          >
            {orders.map((order) => (
              <div role="row" className="order-row" key={order.id}>
                <div role="cell">
                  <strong>#{order.id}</strong>
                  <p>{order.table}</p>
                </div>
                <div role="cell" className="order-items">
                  {order.items}
                </div>
                <span role="cell" className="surface-status">
                  {order.status}
                </span>
                <strong role="cell">{money(order.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
