import type { SeedDatabase, DemoConfig, SeedContext } from "./types";
import { customerLoyaltyTiers, customers, promotions } from "@/db/schema";
import { uuidFor } from "./utils";

const firstNames = [
  "Aditi",
  "Rahul",
  "Ishaan",
  "Sneha",
  "Karan",
  "Pooja",
  "Dev",
  "Riya",
  "Nikhil",
  "Tara",
  "Aditya",
  "Simran",
];
const lastNames = [
  "Shah",
  "Verma",
  "Kulkarni",
  "Bose",
  "Malhotra",
  "Desai",
  "Menon",
  "Chopra",
  "Jain",
  "Reddy",
];

export const seedCustomersAndPromotions = async (
  db: SeedDatabase,
  config: DemoConfig,
  ctx: SeedContext,
): Promise<void> => {
  for (const brand of config.brands) {
    const tenantId = ctx.tenantIds[brand.key]!;
    const tiers = [
      {
        id: uuidFor(`tier:${brand.key}:silver`),
        tenantId,
        name: "Silver",
        discountPercent: "3.00",
      },
      {
        id: uuidFor(`tier:${brand.key}:gold`),
        tenantId,
        name: "Gold",
        discountPercent: "7.50",
      },
      {
        id: uuidFor(`tier:${brand.key}:platinum`),
        tenantId,
        name: "Platinum",
        discountPercent: "12.00",
      },
    ];
    await db.insert(customerLoyaltyTiers).values(tiers);
    const rows = Array.from(
      { length: config.customersPerTenant },
      (_, index) => {
        const first = firstNames[index % firstNames.length]!;
        const last = lastNames[(index * 3) % lastNames.length]!;
        return {
          id: uuidFor(`customer:${brand.key}:${index}`),
          tenantId,
          name: `${first} ${last}`,
          email: `customer.${brand.key}.${index + 1}@example.test`,
          phone: `+919${String(100000000 + index).slice(-9)}`,
          createdAt: new Date(
            config.referenceTime.getTime() -
              (config.historyDays + 1) * 86400000,
          ),
          loyaltyTierId:
            index % 10 === 0
              ? tiers[2]!.id
              : index % 4 === 0
                ? tiers[1]!.id
                : tiers[0]!.id,
        };
      },
    );
    for (let i = 0; i < rows.length; i += 500)
      await db.insert(customers).values(rows.slice(i, i + 500));
    await db.insert(promotions).values([
      {
        id: uuidFor(`promo:${brand.key}:weekday`),
        tenantId,
        name: "Weekday Saver",
        ruleType: "PERCENTAGE",
        scope: "ORDER",
        value: "10.00",
        couponCode: `DEMO10${brand.key.toUpperCase()}`,
        stackableWithLoyalty: true,
        isActive: true,
      },
      {
        id: uuidFor(`promo:${brand.key}:welcome`),
        tenantId,
        name: "Welcome ₹150",
        ruleType: "FIXED_AMOUNT",
        scope: "ORDER",
        value: "150.00",
        couponCode: `WELCOME${brand.key.toUpperCase()}`,
        maxUsesPerCustomer: 1,
        stackableWithLoyalty: false,
        isActive: true,
      },
    ]);
  }
};
