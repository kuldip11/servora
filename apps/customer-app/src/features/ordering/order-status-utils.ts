export const statusLabel = (status: string) => {
  if (status === "SERVED") return "Served";
  if (status === "READY") return "Ready for you";
  if (status === "PREPARING") return "Preparing your food";
  return "Order received";
};

export const orderStatusLabel = (status: "PAID" | "CLOSED" | "CANCELLED") => {
  if (status === "PAID") return "Paid";
  if (status === "CLOSED") return "Completed";
  return "Cancelled";
};
