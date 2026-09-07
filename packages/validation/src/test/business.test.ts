import { describe, expect, it } from "vitest";
import {
  businessBranchFormSchema,
  franchiseBusinessFormSchema,
  organizationBusinessFormSchema,
} from "../business";

const organization = {
  name: "KKS Hospitality",
  businessType: "RESTAURANT_GROUP",
  country: "in",
  timezone: "Asia/Kolkata",
  currency: "inr",
  primaryContactName: "Kuldip",
  businessEmail: "owner@example.com",
  businessPhone: "+91 9999999999",
  addressLine1: "1 MG Road",
  city: "Bengaluru",
  stateProvince: "Karnataka",
  postalCode: "560001",
};
const franchise = {
  name: "KKS Kitchen",
  cuisineTypes: ["Indian"],
  businessModel: "RESTAURANT",
  defaultTaxMode: "EXCLUSIVE",
  defaultCurrency: "inr",
  defaultTimezone: "Asia/Kolkata",
  dineInEnabled: true,
  takeawayEnabled: true,
  deliveryEnabled: true,
  customerQrEnabled: true,
  tableManagementEnabled: true,
  kdsEnabled: true,
  waiterServiceEnabled: true,
};
const branch = {
  name: "Indiranagar",
  code: "blr-1",
  status: "ACTIVE",
  addressLine1: "100 Feet Road",
  city: "Bengaluru",
  stateProvince: "Karnataka",
  postalCode: "560038",
  country: "in",
  timezone: "Asia/Kolkata",
  phone: "+91 9999999999",
  dineInEnabled: true,
  takeawayEnabled: true,
  deliveryEnabled: true,
  customerQrEnabled: true,
  tablesEnabled: true,
  kdsEnabled: true,
  waiterAppEnabled: true,
};

describe("business domain validation", () => {
  it("requires the complete organization business identity and normalizes country/currency", () => {
    const parsed = organizationBusinessFormSchema.parse(organization);
    expect(parsed.country).toBe("IN");
    expect(parsed.currency).toBe("INR");
    expect(
      organizationBusinessFormSchema.safeParse({
        ...organization,
        businessEmail: "bad",
      }).success,
    ).toBe(false);
  });
  it("requires franchise operating defaults and at least one cuisine", () => {
    const parsed = franchiseBusinessFormSchema.parse(franchise);
    expect(parsed.defaultCurrency).toBe("INR");
    expect(
      franchiseBusinessFormSchema.safeParse({ ...franchise, cuisineTypes: [] })
        .success,
    ).toBe(false);
  });
  it("requires an operational branch profile and enforces dine-in/table consistency", () => {
    const parsed = businessBranchFormSchema.parse(branch);
    expect(parsed.code).toBe("BLR-1");
    expect(
      businessBranchFormSchema.safeParse({
        ...branch,
        dineInEnabled: false,
        tablesEnabled: true,
      }).success,
    ).toBe(false);
  });
  it("requires at least one branch fulfillment type", () => {
    const result = businessBranchFormSchema.safeParse({
      ...branch,
      dineInEnabled: false,
      takeawayEnabled: false,
      deliveryEnabled: false,
      tablesEnabled: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["name"],
            message: "Enable at least one fulfillment type",
          }),
        ]),
      );
    }
  });

  it("keeps legal/tax registration identifiers optional", () => {
    expect(organizationBusinessFormSchema.safeParse(organization).success).toBe(
      true,
    );
  });
});
