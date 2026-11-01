export const businessKeys = {
  all: ["business"] as const,
  hierarchy: () => [...businessKeys.all, "hierarchy"] as const,
};
