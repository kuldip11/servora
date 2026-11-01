"use client";
import { useState } from "react";
type Workspace = "guest" | "pos" | "kitchen" | "floor";
type Line = {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  choices: string;
};
const dishes = [
  {
    id: "pizza",
    name: "Mushroom pizza",
    description: "Roasted mushrooms, mozzarella and herbs",
    price: 520,
    category: "Mains",
  },
  {
    id: "bowl",
    name: "Paneer bowl",
    description: "Grilled paneer, rice and vegetables",
    price: 340,
    category: "Mains",
  },
  {
    id: "cooler",
    name: "Lime cooler",
    description: "Lime, mint and soda",
    price: 180,
    category: "Drinks",
  },
];
export function calculateBill(lines: Line[], discount = false) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const discountAmount = discount ? subtotal * 0.1 : 0;
  const taxable = subtotal - discountAmount;
  const tax = Math.round(taxable * 0.05 * 100) / 100;
  return {
    subtotal,
    discountAmount,
    tax,
    total: Math.round((taxable + tax) * 100) / 100,
  };
}
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
const initialCart: Line[] = [
  {
    id: "pizza",
    name: "Mushroom pizza",
    unitPrice: 520,
    quantity: 1,
    choices: "Regular",
  },
  {
    id: "bowl",
    name: "Paneer bowl",
    unitPrice: 340,
    quantity: 1,
    choices: "Regular",
  },
];
export function WorkflowDemo() {
  const [workspace, setWorkspace] = useState<Workspace>("guest");
  const [guestView, setGuestView] = useState<
    "menu" | "customize" | "cart" | "status"
  >("menu");
  const [floorView, setFloorView] = useState("Home");
  const [managementView, setManagementView] = useState("Orders");
  const [branch, setBranch] = useState("Main restaurant");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<Line[]>(initialCart);
  const [selected, setSelected] = useState(dishes[0]!);
  const [large, setLarge] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [discount, setDiscount] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [ticket, setTicket] = useState<"FIRED" | "PREPARING" | "READY">(
    "FIRED",
  );
  const [station, setStation] = useState("Main kitchen");
  const [request, setRequest] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const bill = calculateBill(cart, discount);
  const extraPrices: Record<string, number> =
    selected.id === "cooler"
      ? { "Extra mint": 10, "Less ice": 0 }
      : selected.id === "bowl"
        ? { "Extra paneer": 60, "Chilli oil": 20 }
        : { "Extra cheese": 50, "Chilli oil": 20 };
  const sizeUpgrade = selected.id === "cooler" ? 40 : 140;
  const unitPrice =
    selected.price +
    (large ? sizeUpgrade : 0) +
    extras.reduce(
      (sum, name) => sum + (extraPrices[name as keyof typeof extraPrices] ?? 0),
      0,
    );
  const reset = () => {
    setCart(initialCart);
    setGuestView("menu");
    setQuery("");
    setCategory("All");
    setLarge(false);
    setQuantity(1);
    setExtras([]);
    setDiscount(false);
    setPlaced(false);
    setTicket("FIRED");
    setRequest(null);
    setStation("Main kitchen");
    setNotice("Sample reset.");
  };
  const place = () => {
    if (!cart.length) return;
    setPlaced(true);
    setTicket("FIRED");
    setGuestView("status");
    setNotice("Sample order sent to the local kitchen view.");
  };
  const updateQuantity = (id: string, change: number) =>
    setCart((current) =>
      current
        .map((line) =>
          line.id === id
            ? { ...line, quantity: Math.max(0, line.quantity + change) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  const openItem = (item: typeof selected) => {
    setSelected(item);
    setLarge(false);
    setQuantity(1);
    setExtras([]);
    setGuestView("customize");
  };
  const add = () => {
    const line = {
      id: selected.id,
      name: selected.name,
      unitPrice,
      quantity,
      choices: [large ? "Large" : "Regular", ...extras].join(" · "),
    };
    setCart((current) => [
      ...current.filter((item) => item.id !== line.id),
      line,
    ]);
    setGuestView("cart");
    setNotice("Choices added to the sample cart.");
  };
  const cartPanel = (
    <>
      <h3>Review the order</h3>
      {cart.length ? (
        <div className="demo-lines">
          {cart.map((line) => (
            <article key={line.id}>
              <div>
                <strong>{line.name}</strong>
                <p>{line.choices}</p>
                <span>{money(line.unitPrice)} each</span>
              </div>
              <div className="quantity-control">
                <button
                  type="button"
                  aria-label={`Decrease ${line.name} quantity`}
                  onClick={() => updateQuantity(line.id, -1)}
                >
                  −
                </button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  aria-label={`Increase ${line.name} quantity`}
                  onClick={() => updateQuantity(line.id, 1)}
                >
                  +
                </button>
              </div>
              <strong>{money(line.unitPrice * line.quantity)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <p className="demo-empty">
          Your sample cart is empty. Browse the menu to add an item.
        </p>
      )}
      <label className="demo-check">
        <input
          type="checkbox"
          checked={discount}
          onChange={(event) => setDiscount(event.target.checked)}
        />
        Try a sample 10% discount
      </label>
      <dl className="demo-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{money(bill.subtotal)}</dd>
        </div>
        {discount ? (
          <div>
            <dt>Sample discount</dt>
            <dd>−{money(bill.discountAmount)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Tax · sample 5%</dt>
          <dd>{money(bill.tax)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd data-testid="demo-total">{money(bill.total)}</dd>
        </div>
      </dl>
      <button
        className="demo-primary"
        type="button"
        disabled={!cart.length}
        onClick={place}
      >
        Place sample order
      </button>
    </>
  );
  const statusPanel = (
    <>
      <h3>{placed ? "Your sample order" : "No sample order placed"}</h3>
      {placed ? (
        <>
          <p className="demo-state">
            {ticket === "FIRED"
              ? "Sent to the kitchen"
              : ticket === "PREPARING"
                ? "The kitchen is preparing your order"
                : "Ready for the floor team"}
          </p>
          <p>Table 12 · Sample order #1048</p>
          <p>Switch to the kitchen workspace to advance preparation.</p>
          <div className="demo-controls">
            <button type="button" onClick={() => setRequest("Water requested")}>
              Request water
            </button>
            <button type="button" onClick={() => setRequest("Bill requested")}>
              Request the bill
            </button>
          </div>
          {request ? (
            <p role="status">{request}. Visible in the local floor view.</p>
          ) : null}
        </>
      ) : (
        <p>
          Review the cart, then place the sample order to explore its kitchen
          handoff.
        </p>
      )}
    </>
  );
  return (
    <div className="workflow-demo">
      <div
        className="demo-workspace-selector"
        role="group"
        aria-label="Choose a sample workspace"
      >
        {(
          [
            ["guest", "Guest ordering"],
            ["pos", "Management & POS"],
            ["kitchen", "Kitchen display"],
            ["floor", "Waiter app"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={workspace === key}
            onClick={() => {
              setWorkspace(key);
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="demo-context">
        <div>
          <strong>Sample restaurant · Table 12</strong>
          <p>Shared local state. No real orders, requests or payments.</p>
        </div>
        <button type="button" onClick={reset}>
          Reset sample
        </button>
      </div>
      <div className="demo-live" data-ui>
        {workspace === "guest" ? (
          <div className="demo-guest">
            <div
              className="demo-controls"
              role="group"
              aria-label="Guest demo screens"
            >
              {(["menu", "customize", "cart", "status"] as const).map(
                (view) => (
                  <button
                    type="button"
                    key={view}
                    aria-pressed={guestView === view}
                    onClick={() => setGuestView(view)}
                  >
                    {view === "customize"
                      ? "Customize"
                      : view[0]!.toUpperCase() + view.slice(1)}
                  </button>
                ),
              )}
            </div>
            <div className="demo-guest-content">
              {guestView === "menu" ? (
                <>
                  <h3>Your table. Your menu.</h3>
                  <label className="demo-label">
                    Search the sample menu
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Find a dish"
                    />
                  </label>
                  <div
                    className="demo-controls"
                    role="group"
                    aria-label="Menu categories"
                  >
                    {["All", "Mains", "Drinks"].map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={category === value}
                        onClick={() => setCategory(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="demo-menu">
                    {dishes
                      .filter(
                        (item) =>
                          (category === "All" || item.category === category) &&
                          `${item.name} ${item.description}`
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                      )
                      .map((item) => (
                        <article key={item.id}>
                          <div>
                            <h4>{item.name}</h4>
                            <p>{item.description}</p>
                            <strong>{money(item.price)}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => openItem(item)}
                            aria-label={`Customize ${item.name}`}
                          >
                            +
                          </button>
                        </article>
                      ))}
                    {!dishes.some(
                      (item) =>
                        (category === "All" || item.category === category) &&
                        `${item.name} ${item.description}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                    ) ? (
                      <p className="demo-empty">
                        No dishes match. Try another search or category.
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="demo-primary"
                    onClick={() => setGuestView("cart")}
                  >
                    View order ·{" "}
                    {cart.reduce((sum, line) => sum + line.quantity, 0)} items
                  </button>
                </>
              ) : guestView === "customize" ? (
                <>
                  <h3>{selected.name}</h3>
                  <p>Choose options for this local sample.</p>
                  <label className="demo-check">
                    <input
                      type="checkbox"
                      checked={large}
                      onChange={(event) => setLarge(event.target.checked)}
                    />
                    Large portion · +{money(sizeUpgrade)}
                  </label>
                  <fieldset>
                    <legend>Extras</legend>
                    {Object.entries(extraPrices).map(([name, price]) => (
                      <label className="demo-check" key={name}>
                        <input
                          type="checkbox"
                          checked={extras.includes(name)}
                          onChange={(event) =>
                            setExtras((current) =>
                              event.target.checked
                                ? [...current, name]
                                : current.filter((value) => value !== name),
                            )
                          }
                        />
                        {name} · +{money(price)}
                      </label>
                    ))}
                  </fieldset>
                  <div className="demo-custom-quantity">
                    <span>Quantity</span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label="Decrease customized quantity"
                        onClick={() =>
                          setQuantity((current) => Math.max(1, current - 1))
                        }
                      >
                        −
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        aria-label="Increase customized quantity"
                        onClick={() => setQuantity((current) => current + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button type="button" className="demo-primary" onClick={add}>
                    Add to sample order · {money(unitPrice * quantity)}
                  </button>
                </>
              ) : guestView === "cart" ? (
                cartPanel
              ) : (
                statusPanel
              )}
            </div>
          </div>
        ) : null}
        {workspace === "kitchen" ? (
          <div className="demo-kitchen">
            <header>
              <h3>Kitchen queue</h3>
              <label className="demo-label">
                Station
                <select
                  aria-label="Kitchen station"
                  value={station}
                  onChange={(event) => setStation(event.target.value)}
                >
                  <option>Main kitchen</option>
                  <option>Grill station</option>
                </select>
              </label>
            </header>
            {placed ? (
              <article className="demo-ticket">
                <div>
                  <strong>Table 12</strong>
                  <span>#1048</span>
                </div>
                <span className="demo-state">
                  {ticket === "FIRED"
                    ? "Waiting"
                    : ticket === "PREPARING"
                      ? "Cooking"
                      : "Ready"}
                </span>
                <ul>
                  {cart
                    .filter(
                      (line) =>
                        station === "Main kitchen" || line.id === "pizza",
                    )
                    .map((line) => (
                      <li key={line.id}>
                        <strong>
                          {line.quantity} × {line.name}
                        </strong>
                        <p>{line.choices}</p>
                      </li>
                    ))}
                </ul>
                {ticket === "FIRED" ? (
                  <button
                    type="button"
                    className="demo-primary"
                    onClick={() => setTicket("PREPARING")}
                  >
                    Start cooking
                  </button>
                ) : ticket === "PREPARING" ? (
                  <button
                    type="button"
                    className="demo-primary"
                    onClick={() => setTicket("READY")}
                  >
                    Mark ready
                  </button>
                ) : (
                  <p>Ready for the floor team to collect.</p>
                )}
              </article>
            ) : (
              <div className="demo-empty">
                <h4>No sample ticket yet.</h4>
                <p>
                  Place an order from the guest or POS view, or load the sample
                  to explore preparation.
                </p>
                <button
                  type="button"
                  className="demo-primary"
                  onClick={() => {
                    setCart(initialCart);
                    setPlaced(true);
                    setTicket("FIRED");
                  }}
                >
                  Load sample ticket
                </button>
              </div>
            )}
          </div>
        ) : null}
        {workspace === "floor" ? (
          <div className="demo-floor">
            <div
              className="demo-controls"
              role="group"
              aria-label="Waiter demo screens"
            >
              {["Home", "Orders", "New order"].map((view) => (
                <button
                  type="button"
                  key={view}
                  aria-pressed={floorView === view}
                  onClick={() => setFloorView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
            <h3>
              {floorView === "Home"
                ? "Needs attention"
                : floorView === "Orders"
                  ? "Active orders"
                  : "Take a table order"}
            </h3>
            {floorView === "New order" ? (
              <>
                <p>Use the same sample menu to take the table's choices.</p>
                <button
                  type="button"
                  className="demo-primary"
                  onClick={() => {
                    setWorkspace("guest");
                    setGuestView("menu");
                  }}
                >
                  Open sample menu
                </button>
              </>
            ) : (
              <>
                {placed ? (
                  <article className="demo-attention">
                    <span className="demo-table">12</span>
                    <div>
                      <strong>
                        {ticket === "READY"
                          ? "Ready to serve"
                          : "Order in progress"}
                      </strong>
                      <p>#1048 · {cart.length} items</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(
                          `Sample order #1048 · ${cart.map((line) => `${line.quantity} × ${line.name}`).join(", ")}`,
                        );
                      }}
                    >
                      Open order
                    </button>
                  </article>
                ) : (
                  <p className="demo-empty">
                    No active sample order. Start in guest ordering.
                  </p>
                )}
                {request ? (
                  <article className="demo-attention">
                    <span className="demo-table">12</span>
                    <div>
                      <strong>{request}</strong>
                      <p>Guest request</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRequest(null);
                        setNotice("Sample request resolved.");
                      }}
                    >
                      Resolve request
                    </button>
                  </article>
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {workspace === "pos" ? (
          <div className="demo-management">
            <div
              className="demo-controls"
              role="group"
              aria-label="Management demo sections"
            >
              {["Orders", "Menu", "Inventory", "Business"].map((view) => (
                <button
                  type="button"
                  key={view}
                  aria-pressed={managementView === view}
                  onClick={() => setManagementView(view)}
                >
                  {view}
                </button>
              ))}
            </div>
            <label className="demo-label branch-picker">
              Branch
              <select
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
              >
                <option>Main restaurant</option>
                <option>Second restaurant</option>
              </select>
            </label>
            {branch !== "Main restaurant" ? (
              <p className="demo-empty">
                No records are included for this sample branch. Choose Main
                restaurant to explore the local records.
              </p>
            ) : managementView === "Orders" ? (
              <div className="demo-pos-order">
                <div>
                  <h3>{placed ? "Order #1048" : "Create a sample order"}</h3>
                  <p>Table 12 · Dine in</p>
                  <ul className="demo-order-list">
                    {cart.map((line) => (
                      <li key={line.id}>
                        <span>
                          {line.quantity} × {line.name}
                        </span>
                        <strong>{money(line.unitPrice * line.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="demo-secondary"
                    onClick={() => {
                      setWorkspace("guest");
                      setGuestView("menu");
                    }}
                  >
                    Add or customize items
                  </button>
                </div>
                <div>{cartPanel}</div>
              </div>
            ) : managementView === "Menu" ? (
              <>
                <h3>Menu records</h3>
                <p>
                  Sample items and prices. Changing the real menu requires
                  authorized management access.
                </p>
                <ul className="demo-order-list">
                  {dishes.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.name}
                        <small>{item.category}</small>
                      </span>
                      <strong>{money(item.price)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : managementView === "Inventory" ? (
              <>
                <h3>Stock and recipes</h3>
                <p>
                  This sample lists recipe context; it does not change
                  restaurant stock.
                </p>
                <ul className="demo-order-list">
                  <li>
                    <span>Mushroom pizza</span>
                    <strong>Recipe linked</strong>
                  </li>
                  <li>
                    <span>Paneer bowl</span>
                    <strong>Recipe linked</strong>
                  </li>
                </ul>
              </>
            ) : (
              <>
                <h3>Business context</h3>
                <p>Sample restaurant / Main restaurant</p>
                <p>
                  The actual management application includes business, branch
                  and staff-permission workflows. This local selector only
                  changes the sample context.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>
      <p className="demo-notice">
        Interactive local example. Sample prices, choices and tax are
        illustrative.
      </p>
      <p className="demo-announcement" role="status" aria-live="polite">
        {notice}
      </p>
    </div>
  );
}
