import type { BrandSeed } from "./types";
const descriptors = [
  "Classic",
  "House",
  "Signature",
  "Smoky",
  "Spicy",
  "Herb",
  "Cheesy",
  "Roasted",
  "Creamy",
  "Fresh",
];
export const catalogItem = (
  brand: BrandSeed,
  brandIndex: number,
  index: number,
) => {
  const root = brand.itemRoots[index % brand.itemRoots.length]!;
  const cycle = Math.floor(index / brand.itemRoots.length);
  return {
    name: cycle
      ? `${descriptors[(cycle + index) % descriptors.length]} ${root}`
      : root,
    price: 89 + ((index * 37 + brandIndex * 29) % 510),
    foodType: /chicken|fish|rogan|meat/i.test(root)
      ? ("NON_VEG" as const)
      : /\begg\b/i.test(root)
        ? ("EGG" as const)
        : ("VEG" as const),
    station:
      /coffee|latte|cappuccino|mocha|brew|chai|tea|shake|smoothie|mojito|fizz|cooler|cola|americano|flat white/i.test(
        root,
      )
        ? "beverage"
        : "hot",
  };
};
// Illustrative recipes in the units used by the demo ingredient catalogue.
export const recipeFor = (name: string): Array<[number, number]> => {
  if (/coffee|latte|cappuccino|mocha|brew|americano|flat white/i.test(name))
    return [
      [9, 0.15],
      [11, 0.018],
      [13, 0.01],
    ];
  if (/chai|tea/i.test(name))
    return [
      [9, 0.15],
      [12, 0.008],
      [13, 0.01],
    ];
  if (/mojito|fizz|cooler|cola/i.test(name))
    return [
      [22, 0.05],
      [23, 0.003],
      [13, 0.015],
    ];
  if (/shake|smoothie|kulfi|soft serve/i.test(name))
    return [
      [9, 0.2],
      [13, 0.02],
    ];
  if (/chicken/i.test(name))
    return [
      [4, 0.15],
      [1, 0.05],
      [0, 0.05],
    ];
  if (/paneer/i.test(name))
    return [
      [3, 0.15],
      [1, 0.05],
      [0, 0.05],
    ];
  if (/rice|biryani/i.test(name))
    return [
      [5, 0.12],
      [1, 0.05],
      [14, 0.015],
    ];
  if (/pizza/i.test(name))
    return [
      [6, 0.12],
      [8, 0.05],
      [0, 0.05],
    ];
  if (/fries|nachos|rings/i.test(name))
    return [
      [2, 0.18],
      [14, 0.02],
    ];
  if (/noodles|pasta/i.test(name))
    return [
      [19, 0.12],
      [15, 0.05],
    ];
  if (
    /cake|waffle|pancake|croissant|muffin|brownie|tart|bread|naan|toast|sandwich|burger|wrap/i.test(
      name,
    )
  )
    return [
      [6, 0.12],
      [7, 0.02],
    ];
  return [
    [0, 0.1],
    [1, 0.05],
    [14, 0.01],
  ];
};

export const categoryFor = (brand: BrandSeed, name: string): number => {
  const rules: Record<string, Array<[RegExp, string]>> = {
    cafe: [
      [/cold brew|iced latte/i, "Cold Coffee"],
      [/coffee|latte|cappuccino|mocha|americano|flat white/i, "Espresso"],
      [/chai|tea/i, "Tea"],
      [/smoothie/i, "Smoothies"],
      [/sandwich/i, "Sandwiches"],
      [/croissant|bread|muffin/i, "Bakery"],
      [/brownie/i, "Desserts"],
    ],
    bar: [
      [/mojito|fizz|cooler/i, "Mocktails"],
      [/pizza/i, "Pizza"],
      [/burger/i, "Burgers"],
      [/platter/i, "Sharing Platters"],
      [/tiramisu|tart/i, "Desserts"],
      [/grill|skewer/i, "Grills"],
    ],
    restaurant: [
      [/naan/i, "Breads"],
      [/rice|biryani/i, "Rice & Biryani"],
      [/shorba|soup/i, "Soups"],
      [/tikka|tandoori|kebab/i, "Starters"],
      [/noodles|chilli/i, "Asian"],
      [/salad/i, "Salads"],
      [/jamun|kulfi/i, "Desserts"],
    ],
    qsr: [
      [/burger/i, "Burgers"],
      [/wrap/i, "Wraps"],
      [/bowl/i, "Bowls"],
      [/combo/i, "Combos"],
      [/shake/i, "Shakes"],
      [/tea|cola/i, "Beverages"],
      [/serve|sundae/i, "Desserts"],
    ],
  };
  const fallback =
    brand.key === "restaurant"
      ? "Curries"
      : brand.key === "qsr"
        ? "Sides"
        : brand.key === "cafe"
          ? "Breakfast"
          : "Small Plates";
  return Math.max(
    0,
    brand.categoryNames.indexOf(
      rules[brand.key]?.find(([pattern]) => pattern.test(name))?.[1] ??
        fallback,
    ),
  );
};
