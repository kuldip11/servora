import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createOrganizationBody,
  updateOrganizationBody,
  organizationIdParams,
  organizationMenuParams,
  organizationLoyaltyTierParams,
  createOrganizationMenuBody,
  updateOrganizationMenuBody,
} from "../organization.validator";
const uuid = "123e4567-e89b-12d3-a456-426614174000";
describe("organization validators coverage", () => {
  it("checks valid and invalid shapes", () => {
    expect(Value.Check(createOrganizationBody, { name: "Org" })).toBe(true);
    expect(Value.Check(createOrganizationBody, {})).toBe(false);
    expect(Value.Check(updateOrganizationBody, { country: null })).toBe(true);
    expect(Value.Check(organizationIdParams, { id: uuid })).toBe(true);
    expect(Value.Check(organizationIdParams, { id: "bad" })).toBe(true);
    expect(Value.Check(organizationIdParams, {})).toBe(false);
    expect(
      Value.Check(organizationMenuParams, { id: uuid, menuId: uuid }),
    ).toBe(true);
    expect(
      Value.Check(organizationLoyaltyTierParams, { id: uuid, tierId: uuid }),
    ).toBe(true);
    expect(
      Value.Check(createOrganizationMenuBody, { name: "M", items: [] }),
    ).toBe(true);
    expect(Value.Check(updateOrganizationMenuBody, {})).toBe(true);
  });
});
