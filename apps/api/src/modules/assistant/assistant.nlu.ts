import type { MenuSearchInput } from "./assistant.input";

// Deterministic understanding of common menu questions. It is used (a) as the
// complete fallback when the model provider fails or times out, and (b) to
// override model output where regexes are more reliable than an LLM (numbers).
// Pure functions only: no I/O, easy to unit test.

export type ParsedQuestion = {
  intent: MenuSearchInput["intent"];
  foodType: MenuSearchInput["foodType"] | null;
  mild: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  terms: string[];
  mealTime: MenuSearchInput["mealTime"];
  /** True when the question is a pure "show me the menu" request. */
  browse: boolean;
  greeting: boolean;
  needsDietaryVerification: boolean;
};

const MONEY = String.raw`(?:₹|rs\.?|inr)?\s*(\d{1,6}(?:\.\d{1,2})?)\s*(?:rs\.?|rupees?|inr|/-)?`;
const n = (s: string | undefined) => (s === undefined ? null : Number(s));

export function parsePriceRange(text: string): {
  min: number | null;
  max: number | null;
} {
  const t = text.toLowerCase().replace(/,/g, "");
  const between = new RegExp(
    String.raw`(?:between|from)\s*${MONEY}\s*(?:and|to|-|–)\s*${MONEY}`,
  ).exec(t);
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const range = new RegExp(String.raw`\b${MONEY}\s*(?:to|-|–)\s*${MONEY}`).exec(
    t,
  );
  if (range && /₹|rs|rupee|inr|budget|price|cost/.test(t)) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const max = new RegExp(
    String.raw`(?:under|below|less\s+than|upto|up\s+to|within|max(?:imum)?|cheaper\s+than|not\s+more\s+than|at\s+most|budget\s+(?:of|is)?|<=?)\s*${MONEY}`,
  ).exec(t);
  const min = new RegExp(
    String.raw`(?:above|over|more\s+than|at\s+least|min(?:imum)?|starting\s+(?:from|at)|costlier\s+than|greater\s+than|>=?)\s*${MONEY}`,
  ).exec(t);
  return { min: n(min?.[1]), max: n(max?.[1]) };
}

const STOPWORDS = new Set(
  `a about above all also an and any anything are around at available be below between can could cost cheap cheaper do does for from get give got have having hi hello how i if in is it item items just know like list look looking lunch dinner breakfast me menu more most my need of on one only option options or order please price priced rs rupee rupees serve served serving show some something sort suggest suggestion sure tell than that the their there these this to today tonight too under up upto us want we what whats when which will with within would yes you your veg vegetarian non nonveg spicy spice not mild less much many here dish dishes food eat eating have has had really best good nice tasty popular famous recommend recommended recommendation whats why where who whom whose kindly bro bhai yaar sir restaurant place kitchen hotel tonight tomorrow right now currently list full whole`
    .split(/\s+/)
    .filter(Boolean),
);

export function extractTerms(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[₹]/g, " ")
    .replace(/\b\d+(?:\.\d+)?\b/g, " ")
    .replace(/[^\p{L}\s'-]/gu, " ");
  const seen = new Set<string>();
  for (const raw of cleaned.split(/\s+/)) {
    const word = raw.replace(/^['-]+|['-]+$/g, "");
    if (word.length < 3 || STOPWORDS.has(word)) continue;
    seen.add(word);
    if (seen.size === 6) break;
  }
  return [...seen];
}

const has = (text: string, re: RegExp) => re.test(text);

export function detectMealTime(text: string): MenuSearchInput["mealTime"] {
  const t = text.toLowerCase();
  if (has(t, /\b(breakfast|brunch|morning)\b/)) return "BREAKFAST";
  if (has(t, /\blunch\b/)) return "LUNCH";
  if (has(t, /\b(dinner|supper|night)\b/)) return "DINNER";
  if (has(t, /\b(snack|snacks|starter|starters|appetizer|appetiser)\b/))
    return "SNACKS";
  if (has(t, /\b(dessert|desserts|sweet|sweets)\b/)) return "DESSERT";
  if (has(t, /\b(drink|drinks|beverage|beverages)\b/)) return "DRINKS";
  return null;
}

export function parseQuestion(message: string): ParsedQuestion {
  const text = message.toLowerCase().trim();
  const { min, max } = parsePriceRange(text);
  const nonVeg = has(text, /\bnon[\s-]?veg(?:etarian)?\b/);
  const veg = !nonVeg && has(text, /\b(veg|vegetarian|pure\s+veg)\b/);
  const popular = has(
    text,
    /\b(popular|best[\s-]?sell(?:er|ing)?s?|most\s+(?:ordered|loved|liked|popular)|favou?rites?|famous|signature|top\s+(?:picks?|dishes|items|sellers?)|chef'?s?\s+(?:special|pick|choice)|specialit(?:y|ies)|must[\s-]?try|trending|recommended)\b/,
  );
  const greeting =
    text.length < 40 &&
    has(
      text,
      /^(hi|hii+|hello|hey|hola|namaste|good\s+(?:morning|afternoon|evening)|thanks?|thank\s+you|ok(?:ay)?|cool)\b[\s!.?]*$/,
    );
  const browse = has(
    text,
    /\b(menu|everything|all\s+items|whole\s+menu|what\s+(?:all\s+)?(?:do\s+)?you\s+(?:have|serve|offer|got)|what(?:'s| is)\s+(?:available|there|on))\b/,
  );
  const terms = extractTerms(
    text
      // Drop price phrases so "under 500" never leaks into dish terms.
      .replace(/(?:₹|rs\.?|inr)\s*\d+/g, " ")
      .replace(/\b(under|below|above|over|between|within|upto|up to)\b/g, " "),
  );
  const mealTime = detectMealTime(text);
  const needsDietaryVerification = has(
    text,
    /allerg|peanut|nut[\s-]?free|gluten|lactose|vegan|jain|halal|kosher|pregnan|diabet|ingredient|contain|safe\b|without|free\s+of/,
  );
  return {
    intent: popular ? "POPULAR" : "MENU",
    foodType: nonVeg ? "NON_VEG" : veg ? "VEG" : null,
    mild: has(text, /\b(not\s+spicy|non[\s-]?spicy|mild|less\s+spicy|no\s+spice)\b/),
    minPrice: min,
    maxPrice: max,
    // Meal-time words are handled as a filter, not as a dish name.
    terms: terms.filter(
      (term) =>
        !/^(drinks?|beverages?|desserts?|sweets?|snacks?|starters?|appetizers?|brunch|supper|morning|night|everything|whole)$/.test(
          term,
        ),
    ),
    mealTime,
    browse: browse && !terms.length,
    greeting,
    needsDietaryVerification,
  };
}

/**
 * Combine model output with the deterministic parse.
 * Numbers and meal-time come from the parser when present (regex beats LLM at
 * "above 300 and below 500"); the model wins on dish terms and typos.
 */
export function mergeClassification(
  model: MenuSearchInput | null,
  parsed: ParsedQuestion,
): MenuSearchInput {
  const base: MenuSearchInput = model ?? {
    intent: parsed.intent,
    foodType: parsed.foodType ?? "ANY",
    mild: parsed.mild,
    minPrice: null,
    maxPrice: null,
    terms: parsed.terms,
    mealTime: null,
    needsDietaryVerification: parsed.needsDietaryVerification,
  };
  const terms = (base.terms.length ? base.terms : parsed.terms).filter(
    (t) => t.trim().length > 0,
  );
  return {
    ...base,
    intent:
      base.intent === "MENU" && parsed.intent === "POPULAR"
        ? "POPULAR"
        : base.intent,
    foodType:
      base.foodType === "ANY" && parsed.foodType
        ? parsed.foodType
        : base.foodType,
    mild: base.mild || parsed.mild,
    minPrice: parsed.minPrice ?? base.minPrice,
    maxPrice: parsed.maxPrice ?? base.maxPrice,
    terms,
    mealTime: parsed.mealTime ?? base.mealTime,
    needsDietaryVerification:
      base.needsDietaryVerification || parsed.needsDietaryVerification,
  };
}
