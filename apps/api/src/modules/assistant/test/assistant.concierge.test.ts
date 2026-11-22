import { describe, expect, it } from "vitest";
import { applyFollowUp } from "../assistant.followup";
import { mergeClassification, parsePriceRange, parseQuestion } from "../assistant.nlu";
import { menuSearchInput, type MenuSearchInput } from "../assistant.input";
import { searchCatalog, type Catalog, type CatalogItem } from "../assistant.search";

const item = (
  id: string,
  name: string,
  price: number,
  categoryId: string,
  extra: Partial<CatalogItem> = {},
): CatalogItem => ({
  id,
  name,
  description: null,
  basePrice: String(price),
  foodType: "VEG",
  spiceLevel: null,
  pricingMode: "FIXED",
  categoryId,
  variants: [],
  modifierGroupLinks: [],
  tagLinks: [],
  ...extra,
});
const catalog = (over: Partial<Catalog> = {}): Catalog => ({
  categories: [
    { id: "coffee", name: "Coffee" },
    { id: "bakery", name: "Bakery & Breakfast" },
    { id: "mains", name: "Main Course" },
    { id: "dessert", name: "Desserts" },
  ],
  available: [
    item("1", "Cappuccino", 89, "coffee"),
    item("2", "Cafe Latte", 126, "coffee"),
    item("3", "Flat White", 163, "coffee"),
    item("4", "Pancakes", 97, "bakery"),
    item("5", "Herb Pancakes", 327, "bakery", { variants: [{}] }),
    item("6", "Paneer Butter Masala", 380, "mains"),
    item("7", "Chicken Curry", 420, "mains", { foodType: "NON_VEG" }),
    item("8", "Dal Makhani", 260, "mains"),
  ],
  unavailable: [item("9", "Chocolate Brownie", 150, "dessert")],
  popularity: new Map(),
  ...over,
});
const query = (message: string, over: Partial<MenuSearchInput> = {}) =>
  mergeClassification(null, parseQuestion(message)) && {
    ...mergeClassification(null, parseQuestion(message)),
    ...over,
  };
const names = (c: Catalog, message: string) =>
  searchCatalog(c, query(message)).items.map((i) => i.name);

describe("price parsing", () => {
  it.each([
    ["what all you have under 500?", null, 500],
    ["above 300 and below 500", 300, 500],
    ["between ₹200 and ₹400", 200, 400],
    ["dishes over Rs. 250", 250, null],
    ["vegetarian under ₹1,200", null, 1200],
    ["coffee", null, null],
  ])("%s", (text, min, max) =>
    expect(parsePriceRange(text)).toEqual({ min, max }),
  );
});

describe("transcript regressions", () => {
  it("answers 'coffee' and the typo 'cofee?' with coffee dishes", () => {
    expect(names(catalog(), "Coffee")).toEqual(
      expect.arrayContaining(["Cappuccino", "Cafe Latte", "Flat White"]),
    );
    expect(names(catalog(), "cofee?")).toContain("Cappuccino");
    expect(names(catalog(), "cappucchino")).toEqual(["Cappuccino"]);
  });

  it("lists drinks for 'what are you serving in drinks'", () => {
    const result = names(catalog(), "why all you are serving in drinks today?");
    expect(result).toEqual(
      expect.arrayContaining(["Cappuccino", "Cafe Latte"]),
    );
    expect(result).not.toContain("Paneer Butter Masala");
  });

  it("honours a min and max budget (configurable items are not budget-matched)", () => {
    const rows = searchCatalog(
      catalog(),
      query("above 300 and below 500"),
    ).items;
    expect(rows.map((r) => r.name).sort()).toEqual([
      "Chicken Curry",
      "Paneer Butter Masala",
    ]);
  });

  it("marks configurable dishes when no budget is applied", () => {
    const rows = searchCatalog(catalog(), query("pancakes")).items;
    expect(rows.find((r) => r.name === "Herb Pancakes")?.hasOptions).toBe(true);
  });

  it("suggests mains, not coffee, for dinner", () => {
    const rows = searchCatalog(catalog(), query("what will you suggest for dinner?"));
    expect(rows.items.length).toBeGreaterThan(0);
    expect(rows.items.map((r) => r.name)).not.toContain("Cappuccino");
    expect(rows.items.map((r) => r.name)).not.toContain("Pancakes");
  });

  it("does not claim pancakes are cakes", () => {
    const result = searchCatalog(catalog(), query("do you serve cakes?"));
    expect(result.items).toEqual([]);
    expect(result.namedButMissing).toBe(true);
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it("reports unavailable dishes instead of 'not found'", () => {
    const result = searchCatalog(catalog(), query("do you have brownie?"));
    expect(result.items).toEqual([]);
    expect(result.unavailableMatches).toEqual(["Chocolate Brownie"]);
  });

  it("ranks by real order history for 'what's popular'", () => {
    const c = catalog({ popularity: new Map([["8", 40], ["2", 25], ["4", 3]]) });
    const result = searchCatalog(c, query("whats popular here in this restaurant?"));
    expect(result.usedHistory).toBe(true);
    expect(result.items.map((r) => r.name).slice(0, 3)).toEqual([
      "Dal Makhani",
      "Cafe Latte",
      "Pancakes",
    ]);
  });

  it("falls back to a spread of the menu when there is no history", () => {
    const result = searchCatalog(catalog(), query("whats popular here?"));
    expect(result.usedHistory).toBe(false);
    expect(new Set(result.items.map((i) => i.id)).size).toBe(result.items.length);
    // Mixed categories, not six coffees.
    expect(result.items.map((i) => i.name)).toContain("Dal Makhani");
  });

  it("respects veg / non-veg", () => {
    expect(names(catalog(), "non veg dishes")).toEqual(["Chicken Curry"]);
    expect(names(catalog(), "vegetarian under 300")).not.toContain("Chicken Curry");
  });
});

describe("input robustness", () => {
  it("rejects invalid values instead of silently widening filters", () => {
    const base = { intent: "MENU", needsDietaryVerification: false };
    expect(menuSearchInput.safeParse({ ...base, foodType: "MEAT" }).success).toBe(false);
    expect(menuSearchInput.safeParse({ ...base, maxPrice: -1 }).success).toBe(false);
    expect(menuSearchInput.safeParse({ ...base, terms: Array(7).fill("x") }).success).toBe(false);
  });

  it("accepts extra/missing optional model fields instead of failing", () => {
    const parsed = menuSearchInput.safeParse({
      intent: "MENU",
      needsDietaryVerification: false,
      terms: ["coffee"],
      somethingNew: true,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.maxPrice).toBeNull();
  });

  it("lets deterministic prices override model numbers", () => {
    const merged = mergeClassification(
      {
        intent: "MENU", foodType: "ANY", mild: false, minPrice: null,
        maxPrice: 300, terms: [], mealTime: null, needsDietaryVerification: false,
      },
      parseQuestion("above 300 and below 500"),
    );
    expect([merged.minPrice, merged.maxPrice]).toEqual([300, 500]);
  });

  it("flags dietary words for verification", () => {
    expect(parseQuestion("is this gluten free").needsDietaryVerification).toBe(true);
  });
});

describe("follow-ups", () => {
  const state = {
    foodType: "VEG", mild: false, minPrice: null, maxPrice: 500,
    terms: ["coffee"], mealTime: null,
  };
  it("refines the previous search with a new price bound", () => {
    const next = applyFollowUp(query("above 100"), parseQuestion("above 100"), state);
    expect(next).toMatchObject({ terms: ["coffee"], foodType: "VEG", minPrice: 100, maxPrice: null });
  });
  it("starts fresh when a new dish is named", () => {
    const next = applyFollowUp(query("pancakes"), parseQuestion("pancakes"), state);
    expect(next.terms).toEqual(["pancakes"]);
    expect(next.maxPrice).toBeNull();
  });
  it("ignores malformed state", () => {
    const base = query("under 200");
    expect(applyFollowUp(base, parseQuestion("under 200"), { bogus: 1 })).toEqual(base);
  });
});
