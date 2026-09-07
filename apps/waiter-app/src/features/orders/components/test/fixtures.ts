export const order = {
  id: "12345678-1234",
  status: "OPEN",
  type: "DINE_IN",
  subtotal: 100,
  taxAmount: 18,
  totalAmount: 118,
  items: [
    { id: "1", quantity: 1, menuItemName: "Paneer" },
    { id: "2", quantity: 2, menuItemName: "Naan" },
    { id: "3", quantity: 1, menuItemName: "Rice" },
  ],
  table: { name: "7" },
  statusHistory: [
    { id: "h1", changedAt: "2026-01-01T10:00:00Z", newStatus: "OPEN" },
  ],
} as any;

export const readyTicket = {
  id: "t1",
  ticketNumber: 1,
  status: "READY",
  notes: "Hot",
  items: [
    {
      id: "i1",
      quantity: 2,
      menuItemName: "Paneer",
      subtotal: 200,
      variantName: "Large",
      modifiers: [{ name: "Spicy" }],
      chefNotes: "No onion",
    },
  ],
} as any;
