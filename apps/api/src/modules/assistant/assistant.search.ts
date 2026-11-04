import type { AssistantReply } from "@pos/contracts";
import type { MealTime, MenuSearchInput } from "./assistant.input";

export type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | number;
  foodType: "VEG" | "NON_VEG" | "EGG";
  spiceLevel: string | null;
  pricingMode: string;
  categoryId: string;
  variants: unknown[];
  modifierGroupLinks: unknown[];
  tagLinks: Array<{ tag: { name: string } }>;
};
export type CatalogCategory = { id: string; name: string };
export type Catalog = {
  /** Orderable right now in this session's channel. */
  available: CatalogItem[];
  /** Published but not orderable right now (out of stock, off-schedule, hidden). */
  unavailable: CatalogItem[];
  categories: CatalogCategory[];
  /** menuItemId -> units ordered recently. Empty when there is no history. */
  popularity: Map<string, number>;
};
type ReplyItem = AssistantReply["items"][number];

export const MAX_RESULTS = 6;

/* ------------------------------ text helpers ------------------------------ */

export const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Cheap singulariser: "cakes"->"cake", "sandwiches"->"sandwich", "berries"->"berry". */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}
const tokens = (text: string) =>
  normalize(text).split(" ").filter(Boolean).map(stem);

export function editDistance(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (prev[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length] ?? limit + 1;
}

/** Fuzzy tolerance grows with word length; short words must match exactly. */
const tolerance = (len: number) => (len >= 8 ? 2 : len >= 5 ? 1 : 0);
const closeTo = (a: string, b: string) => {
  const limit = tolerance(Math.min(a.length, b.length));
  return limit > 0 && editDistance(a, b, limit) <= limit;
};

/* ------------------------------ vocabulary -------------------------------- */

// Words a diner uses for a group of dishes. Each group expands to the words
// that commonly appear in item or category names. Matching is name/category
// based, so a restaurant's own naming always wins over this list.
const SYNONYMS: Record<string, string[]> = {
  coffee: [
    "coffee", "cappuccino", "latte", "espresso", "americano", "mocha",
    "macchiato", "flat white", "cortado", "frappe", "cold brew", "filter",
  ],
  tea: ["tea", "chai", "matcha", "kahwa", "infusion"],
  juice: ["juice", "fresh lime", "lemonade", "nimbu", "shikanji"],
  shake: ["shake", "smoothie", "milkshake", "lassi", "frappe"],
  drink: [
    "coffee", "tea", "juice", "shake", "soda", "mocktail", "beverage",
    "drink", "lassi", "cola", "water", "latte", "cappuccino",
  ],
  cake: ["cake", "pastry", "brownie", "cheesecake", "muffin", "cupcake", "gateau"],
  dessert: [
    "dessert", "sweet", "cake", "brownie", "ice cream", "pudding",
    "gulab jamun", "halwa", "kheer", "pastry", "mousse", "tiramisu", "waffle",
  ],
  bread: ["bread", "toast", "bun", "croissant", "roti", "naan", "paratha", "kulcha"],
  breakfast: ["breakfast", "pancake", "waffle", "omelette", "toast", "croissant", "poha", "upma", "paratha"],
  snack: ["snack", "starter", "fries", "nachos", "sandwich", "wrap", "burger", "pakora", "samosa", "tikka"],
  sandwich: ["sandwich", "sub", "panini", "toast", "wrap", "burger"],
  rice: ["rice", "biryani", "pulao", "fried rice", "khichdi"],
  noodle: ["noodle", "pasta", "spaghetti", "chowmein", "hakka", "ramen", "macaroni"],
  pizza: ["pizza", "flatbread"],
  burger: ["burger", "slider"],
  soup: ["soup", "broth", "shorba"],
  salad: ["salad", "bowl"],
};
// Spelling variants / typos that fuzzy matching alone can't reach.
const ALIASES: Record<string, string> = {
  cofee: "coffee", coffe: "coffee", kofi: "coffee", capuccino: "cappuccino",
  cappucino: "cappuccino", cappucchino: "cappuccino", expresso: "espresso",
  chai: "tea", drinks: "drink", beverage: "drink", beverages: "drink",
  desserts: "dessert", sweets: "dessert", sweet: "dessert",
  noodles: "noodle", pastas: "noodle", fries: "snack", starters: "snack",
  snacks: "snack", burgers: "burger", sandwiches: "sandwich",
};
const GROUPS = Object.keys(SYNONYMS);

function expandTerm(raw: string): { words: string[]; group: string | null } {
  const norm = normalize(raw);
  const aliased = ALIASES[norm] ?? norm;
  const stemmed = stem(aliased);
  const group =
    GROUPS.find((g) => g === aliased || g === stemmed) ??
    GROUPS.find((g) => closeTo(g, stemmed) && stemmed.length >= 4) ??
    null;
  return {
    group,
    words: group ? (SYNONYMS[group] ?? []).map(normalize) : [aliased],
  };
}

/* ------------------------------- scoring ---------------------------------- */

type Indexed = {
  item: CatalogItem;
  nameTokens: string[];
  nameText: string;
  categoryTokens: string[];
  categoryName: string;
  extraTokens: string[];
};

function index(items: CatalogItem[], categories: Map<string, string>): Indexed[] {
  return items.map((item) => {
    const categoryName = categories.get(item.categoryId) ?? "";
    return {
      item,
      nameTokens: tokens(item.name),
      nameText: normalize(item.name),
      categoryTokens: tokens(categoryName),
      categoryName: normalize(categoryName),
      extraTokens: tokens(
        `${item.description ?? ""} ${item.tagLinks.map((l) => l.tag.name).join(" ")}`,
      ),
    };
  });
}

function wordScore(word: string, row: Indexed, fuzzy: boolean): number {
  const parts = normalize(word).split(" ").map(stem);
  const phrase = parts.join(" ");
  // Whole-word match only: "cake" must not hit "pancakes".
  if (parts.every((p) => row.nameTokens.includes(p))) return 3;
  if (parts.every((p) => row.categoryTokens.includes(p))) return 2;
  if (parts.every((p) => row.extraTokens.includes(p))) return 1;
  if (!fuzzy || parts.length !== 1) return 0;
  const p = parts[0] ?? phrase;
  if (p.length < 4) return 0;
  const pool = [...row.nameTokens, ...row.categoryTokens];
  if (pool.some((t) => closeTo(p, t))) return 1.5;
  // Prefix typing: "cappu" -> "cappuccino".
  if (p.length >= 4 && row.nameTokens.some((t) => t.startsWith(p))) return 1.5;
  return 0;
}

function termScore(term: string, row: Indexed): number {
  const { words, group } = expandTerm(term);
  let best = 0;
  for (const word of words) {
    // The literal term may be fuzzy-matched; group synonyms are exact only.
    const fuzzy = !group || word === normalize(term);
    best = Math.max(best, wordScore(word, row, fuzzy) * (group ? 0.9 : 1));
  }
  return best;
}

/* ------------------------- meal-time classification ----------------------- */

const BEVERAGE = /(coffee|tea|drink|beverage|juice|shake|smoothie|soda|mocktail|lassi|brew|latte|chai)/;
const DESSERT = /(dessert|sweet|cake|pastry|ice cream|brownie|pudding|bakery)/;
const BREAKFAST = /(breakfast|brunch|pancake|waffle|omelette|egg)/;
const SNACK = /(snack|starter|appetizer|appetiser|sandwich|burger|wrap|fries|bites?)/;

export type Kind = "DRINKS" | "DESSERT" | "BREAKFAST" | "SNACKS" | "MAIN";
export function classify(row: Pick<Indexed, "nameText" | "categoryName">): Kind {
  const hay = `${row.categoryName} ${row.nameText}`;
  if (BEVERAGE.test(row.categoryName)) return "DRINKS";
  if (DESSERT.test(row.categoryName)) return "DESSERT";
  if (BREAKFAST.test(row.categoryName)) return "BREAKFAST";
  if (SNACK.test(row.categoryName)) return "SNACKS";
  if (BEVERAGE.test(row.nameText)) return "DRINKS";
  if (DESSERT.test(row.nameText)) return "DESSERT";
  if (BREAKFAST.test(hay)) return "BREAKFAST";
  return "MAIN";
}
const MEAL_KINDS: Record<MealTime, Kind[]> = {
  BREAKFAST: ["BREAKFAST", "DRINKS", "SNACKS"],
  LUNCH: ["MAIN", "SNACKS"],
  DINNER: ["MAIN", "SNACKS"],
  SNACKS: ["SNACKS"],
  DRINKS: ["DRINKS"],
  DESSERT: ["DESSERT"],
};

/* --------------------------------- filters -------------------------------- */

function passesFilters(item: CatalogItem, input: MenuSearchInput): boolean {
  const price = Number(item.basePrice);
  if (!Number.isFinite(price) || price < 0) return false;
  if (input.foodType !== "ANY" && item.foodType !== input.foodType) return false;
  if (input.mild && !["MILD", "NONE", ""].includes(item.spiceLevel ?? "")) return false;
  // Weight/open-price items have no honest per-item price to compare.
  const constrained = input.maxPrice !== null || input.minPrice !== null;
  if (constrained && item.pricingMode !== "FIXED") return false;
  // No misleading budget claims for configurable items: options can change the
  // price, so they are only listed when the diner is not filtering by price.
  if (constrained && (item.variants.length || item.modifierGroupLinks.length))
    return false;
  if (input.maxPrice !== null && price > input.maxPrice) return false;
  if (input.minPrice !== null && price < input.minPrice) return false;
  return true;
}

const toReply = (item: CatalogItem): ReplyItem => ({
  id: item.id,
  name: item.name,
  basePrice: String(item.basePrice),
  foodType: item.foodType,
  spiceLevel: item.spiceLevel,
  hasOptions: Boolean(item.variants.length || item.modifierGroupLinks.length),
});

/** Round-robin across categories so one category (e.g. coffee) can't fill the list. */
function diversify(rows: Indexed[], limit: number): Indexed[] {
  const buckets = new Map<string, Indexed[]>();
  for (const row of rows) {
    const list = buckets.get(row.item.categoryId) ?? [];
    list.push(row);
    buckets.set(row.item.categoryId, list);
  }
  const out: Indexed[] = [];
  const lists = [...buckets.values()];
  for (let round = 0; out.length < limit && lists.some((l) => l[round]); round++)
    for (const list of lists) {
      const row = list[round];
      if (row && out.length < limit) out.push(row);
    }
  return out;
}

/* ---------------------------------- API ----------------------------------- */

export type SearchResult = {
  items: ReplyItem[];
  /** Unavailable items that match the requested dish terms. */
  unavailableMatches: string[];
  /** True when the diner named something specific and nothing orderable matched. */
  namedButMissing: boolean;
  /** True when popularity ranking had real order history behind it. */
  usedHistory: boolean;
  /** Orderable alternatives when the named dish is missing (same filters). */
  alternatives: ReplyItem[];
};

export function searchCatalog(catalog: Catalog, input: MenuSearchInput): SearchResult {
  const cats = new Map(catalog.categories.map((c) => [c.id, c.name]));
  const terms = input.terms.map((t) => t.trim()).filter(Boolean);
  const rows = index(catalog.available, cats);
  const popularity = catalog.popularity;
  const pop = (r: Indexed) => popularity.get(r.item.id) ?? 0;
  const byPopularity = (a: Indexed, b: Indexed) =>
    pop(b) - pop(a) ||
    a.item.name.localeCompare(b.item.name) ||
    a.item.id.localeCompare(b.item.id);

  const filtered = rows.filter((r) => passesFilters(r.item, input));

  // Meal-time is a preference: apply it if it leaves something, else ignore it.
  let pool = filtered;
  if (input.mealTime) {
    const kinds = MEAL_KINDS[input.mealTime];
    const meal = filtered.filter((r) => kinds.includes(classify(r)));
    if (meal.length) pool = meal;
  }

  let ranked: Indexed[];
  let usedHistory = false;
  if (terms.length) {
    ranked = pool
      .map((row) => ({
        row,
        score: terms.reduce((sum, t) => sum + termScore(t, row), 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || byPopularity(a.row, b.row))
      .map((x) => x.row);
  } else if (input.intent === "POPULAR") {
    usedHistory = pool.some((r) => pop(r) > 0);
    ranked = [...pool].sort(byPopularity);
    if (!usedHistory) ranked = diversify(ranked, MAX_RESULTS);
  } else {
    // Browse / "suggest something": popular first, spread across the menu.
    usedHistory = pool.some((r) => pop(r) > 0);
    ranked = diversify([...pool].sort(byPopularity), MAX_RESULTS);
  }
  const items = ranked.slice(0, MAX_RESULTS).map((r) => toReply(r.item));

  let unavailableMatches: string[] = [];
  let alternatives: ReplyItem[] = [];
  const namedButMissing = terms.length > 0 && items.length === 0;
  if (terms.length) {
    const down = index(catalog.unavailable, cats);
    unavailableMatches = down
      .filter((r) => terms.some((t) => termScore(t, r) >= 1.5))
      .slice(0, 3)
      .map((r) => r.item.name);
    if (namedButMissing)
      alternatives = diversify([...pool].sort(byPopularity), 4).map((r) =>
        toReply(r.item),
      );
  }
  return { items, unavailableMatches, namedButMissing, usedHistory, alternatives };
}
