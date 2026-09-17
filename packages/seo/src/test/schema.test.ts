import { describe, expect, it } from "vitest";
import {
  createBreadcrumbSchema,
  createOrganizationSchema,
  createSoftwareApplicationSchema,
} from "../schema";

describe("schema builders", () => {
  const baseUrl = "https://servora.app";

  it("uses the public logo in organization schema", () => {
    expect(createOrganizationSchema(baseUrl)).toMatchObject({
      logo: `${baseUrl}/icon-512.png`,
    });
  });

  it("creates absolute software URLs", () => {
    expect(
      createSoftwareApplicationSchema({
        baseUrl,
        name: "Servora POS",
        path: "/product/pos-and-orders",
        description: "POS",
      }).url,
    ).toBe(`${baseUrl}/product/pos-and-orders`);
  });

  it("creates ordered breadcrumbs", () => {
    const schema = createBreadcrumbSchema(baseUrl, [
      { name: "Product", path: "/product" },
      { name: "POS", path: "/product/pos-and-orders" },
    ]);
    expect(schema.itemListElement.map((item) => item.position)).toEqual([1, 2]);
  });
});
