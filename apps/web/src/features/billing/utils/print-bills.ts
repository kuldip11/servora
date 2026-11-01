import type { BillDto as Bill, OrderDto as Order } from "@pos/api-client";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const money = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value));

const paidAmount = (bill: Bill) =>
  (bill.payments ?? [])
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

export const printBills = (order: Order, selectedBills: Bill[]) => {
  if (!selectedBills.length) return;
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups to print bills");
  popup.opener = null;

  const sections = selectedBills
    .map((bill, index) => {
      const paid = paidAmount(bill);
      const due = Math.max(0, Number(bill.totalAmount) - paid);
      const assignments = bill.itemAssignments ?? [];
      return `
        <section class="bill">
          <header>
            <h1>Servora</h1>
            <p>${escapeHtml(order.table?.name ? `Table ${order.table.name}` : order.type.replace(/_/g, " "))}</p>
            <p>Order #${escapeHtml(order.id.slice(-8).toUpperCase())}</p>
            <p>${escapeHtml(bill.splitLabel ?? `Bill ${index + 1}`)}</p>
          </header>
          <table>
            <thead><tr><th>Item</th><th>Qty</th></tr></thead>
            <tbody>
              ${assignments
                .map(
                  ({ orderItem }) =>
                    `<tr><td>${escapeHtml(orderItem?.menuItemName ?? "Item")}</td><td>${escapeHtml(orderItem?.quantity ?? 1)}</td></tr>`,
                )
                .join("")}
            </tbody>
          </table>
          <dl>
            <div><dt>Subtotal</dt><dd>${money(bill.subtotal)}</dd></div>
            <div><dt>Tax</dt><dd>${money(bill.taxAmount)}</dd></div>
            ${Number(bill.discountAmount) ? `<div><dt>Discount</dt><dd>−${money(bill.discountAmount)}</dd></div>` : ""}
            ${Number(bill.serviceChargeAmount) ? `<div><dt>Service charge</dt><dd>${money(bill.serviceChargeAmount)}</dd></div>` : ""}
            <div class="total"><dt>Total</dt><dd>${money(bill.totalAmount)}</dd></div>
            <div><dt>Paid</dt><dd>${money(paid)}</dd></div>
            <div class="due"><dt>Outstanding</dt><dd>${money(due)}</dd></div>
          </dl>
          <footer>${due <= 0.005 ? "PAID" : "PAYMENT DUE"}</footer>
        </section>`;
    })
    .join("");

  popup.document
    .write(`<!doctype html><html><head><title>Order ${escapeHtml(order.id.slice(-8))} bills</title><style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #171717; font: 14px/1.45 system-ui, sans-serif; }
    .bill { margin: 0 auto; max-width: 76mm; page-break-after: always; }
    .bill:last-child { page-break-after: auto; }
    header { text-align: center; border-bottom: 1px dashed #999; padding-bottom: 12px; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; }
    th, td { padding: 6px 0; border-bottom: 1px solid #ddd; text-align: left; }
    th:last-child, td:last-child { text-align: right; }
    dl { margin: 0; }
    dl div { display: flex; justify-content: space-between; padding: 3px 0; }
    dd { margin: 0; font-variant-numeric: tabular-nums; }
    .total, .due { margin-top: 4px; border-top: 1px solid #222; padding-top: 7px; font-weight: 700; }
    footer { margin-top: 16px; padding: 8px; text-align: center; border: 2px solid #222; font-weight: 800; letter-spacing: .12em; }
  </style></head><body>${sections}<script>window.addEventListener("load",()=>{window.print();window.close()})<\/script></body></html>`);
  popup.document.close();
};
