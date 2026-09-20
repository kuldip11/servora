import type { BranchResponse, BranchTakeawayQrResponse } from "@pos/contracts";
import { branches } from "@/db/schema";

type BranchRecord = typeof branches.$inferSelect;

export const toBranchResponse = (branch: BranchRecord): BranchResponse => ({
  id: branch.id,
  tenantId: branch.tenantId,
  name: branch.name,
  code: branch.code,
  timezone: branch.timezone,
  currency: branch.currency,
  address: branch.address,
  addressLine1: branch.addressLine1,
  addressLine2: branch.addressLine2,
  city: branch.city,
  stateProvince: branch.stateProvince,
  postalCode: branch.postalCode,
  country: branch.country,
  phone: branch.phone,
  managerName: branch.managerName,
  email: branch.email,
  openingTime: branch.openingTime,
  closingTime: branch.closingTime,
  weeklyOperatingDays: branch.weeklyOperatingDays ?? null,
  taxOverride: branch.taxOverride,
  serviceChargeOverride: branch.serviceChargeOverride,
  invoicePrefix: branch.invoicePrefix,
  receiptFooter: branch.receiptFooter,
  inventoryTrackingEnabled: branch.inventoryTrackingEnabled,
  negativeStockPolicy:
    branch.negativeStockPolicy as BranchResponse["negativeStockPolicy"],
  isActive: branch.isActive,
  dineInEnabled: branch.dineInEnabled,
  takeawayEnabled: branch.takeawayEnabled,
  deliveryEnabled: branch.deliveryEnabled,
  onlineEnabled: branch.onlineEnabled,
  tablesEnabled: branch.tablesEnabled,
  customerQrEnabled: branch.customerQrEnabled,
  kdsEnabled: branch.kdsEnabled,
  waiterAppEnabled: branch.waiterAppEnabled,
  publicTakeawayQrToken: branch.publicTakeawayQrToken,
  createdAt: branch.createdAt.toISOString(),
  updatedAt: branch.updatedAt.toISOString(),
});

export const toBranchTakeawayQrResponse = (value: {
  branchId: string;
  branchName: string;
  enabled: boolean;
  token: string;
}): BranchTakeawayQrResponse => ({ ...value });
