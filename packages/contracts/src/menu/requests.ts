import { Type, type Static } from "@sinclair/typebox";
import { uuidSchema } from "../common/ids";

export const menuChannelSchema = Type.Union([
  Type.Literal("STAFF"),
  Type.Literal("CUSTOMER_QR"),
]);
export const fulfillmentTypeSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
  Type.Literal("DELIVERY"),
  Type.Literal("ONLINE"),
]);
export const menuScheduleTypeSchema = Type.Union([
  Type.Literal("DAILY"),
  Type.Literal("WEEKLY"),
  Type.Literal("SPECIFIC_DATE"),
  Type.Literal("HOLIDAY"),
]);

export const createMenuBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(Type.String({ maxLength: 5000 })),
  },
  { additionalProperties: false },
);

export const updateMenuBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    description: Type.Optional(
      Type.Union([Type.String({ maxLength: 5000 }), Type.Null()]),
    ),
    availableChannels: Type.Optional(
      Type.Union([Type.Array(menuChannelSchema), Type.Null()]),
    ),
    availableFulfillmentTypes: Type.Optional(
      Type.Union([Type.Array(fulfillmentTypeSchema), Type.Null()]),
    ),
    availableBranchIds: Type.Optional(
      Type.Union([Type.Array(uuidSchema), Type.Null()]),
    ),
    effectiveFrom: Type.Optional(
      Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
    ),
  },
  { additionalProperties: false, minProperties: 1 },
);

export const activeMenusQuerySchema = Type.Object(
  {
    channel: menuChannelSchema,
    fulfillmentType: fulfillmentTypeSchema,
  },
  { additionalProperties: false },
);

export const menuScheduleBodySchema = Type.Object(
  {
    scheduleType: menuScheduleTypeSchema,
    startTime: Type.Optional(Type.String()),
    endTime: Type.Optional(Type.String()),
    dayOfWeek: Type.Optional(Type.Integer({ minimum: 0, maximum: 6 })),
    startDate: Type.Optional(Type.String({ format: "date" })),
    endDate: Type.Optional(Type.String({ format: "date" })),
    holidayName: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  },
  { additionalProperties: false },
);

export const menuIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export const createCategoryBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 100 }),
    description: Type.Optional(Type.String({ maxLength: 5000 })),
    sortOrder: Type.Optional(Type.Integer()),
    branchId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);

export const updateCategoryBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    description: Type.Optional(Type.String({ maxLength: 5000 })),
    sortOrder: Type.Optional(Type.Integer()),
  },
  { additionalProperties: false, minProperties: 1 },
);
export const categoryIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);

export type CreateMenuRequest = Static<typeof createMenuBodySchema>;
export type UpdateMenuRequest = Static<typeof updateMenuBodySchema>;

export const foodTypeSchema = Type.Union([
  Type.Literal("VEG"),
  Type.Literal("NON_VEG"),
  Type.Literal("EGG"),
]);
export const spiceLevelSchema = Type.Union([
  Type.Literal("NONE"),
  Type.Literal("MILD"),
  Type.Literal("MEDIUM"),
  Type.Literal("HOT"),
]);
export const pricingModeSchema = Type.Union([
  Type.Literal("FIXED"),
  Type.Literal("WEIGHT_BASED"),
  Type.Literal("OPEN"),
]);
export const weightUnitSchema = Type.Union([
  Type.Literal("G"),
  Type.Literal("KG"),
  Type.Literal("LB"),
  Type.Literal("OZ"),
]);
export const zonePricingRuleSchema = Type.Union([
  Type.Literal("AVERAGE"),
  Type.Literal("HIGHER"),
  Type.Literal("SUM_HALF"),
]);
export const menuTaxModeSchema = Type.Union([
  Type.Literal("INCLUSIVE"),
  Type.Literal("EXCLUSIVE"),
]);
export const menuItemStatusSchema = Type.Union([
  Type.Literal("ACTIVE"),
  Type.Literal("OUT_OF_STOCK"),
  Type.Literal("HIDDEN"),
  Type.Literal("SEASONAL"),
  Type.Literal("DISCONTINUED"),
]);
export const menuItemDisplayModeSchema = Type.Union([
  Type.Literal("STANDARD"),
  Type.Literal("GUIDED_BUILDER"),
]);

const menuItemVariantInputSchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 100 }),
    price: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const createMenuItemBodySchema = Type.Object(
  {
    categoryId: uuidSchema,
    name: Type.String({ minLength: 1, maxLength: 200 }),
    description: Type.Optional(
      Type.Union([Type.String({ maxLength: 5000 }), Type.Null()]),
    ),
    basePrice: Type.Number({ minimum: 0 }),
    manualCost: Type.Optional(
      Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    ),
    pricingMode: Type.Optional(pricingModeSchema),
    weightUnit: Type.Optional(weightUnitSchema),
    openPriceMin: Type.Optional(Type.Number({ minimum: 0 })),
    openPriceMax: Type.Optional(Type.Number({ minimum: 0 })),
    supportsZones: Type.Optional(Type.Boolean()),
    zonePricingRule: Type.Optional(zonePricingRuleSchema),
    manualStockCount: Type.Optional(Type.Integer({ minimum: 0 })),
    taxRate: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    taxMode: Type.Optional(Type.Union([menuTaxModeSchema, Type.Null()])),
    branchId: Type.Optional(uuidSchema),
    foodType: Type.Optional(foodTypeSchema),
    spiceLevel: Type.Optional(Type.Union([spiceLevelSchema, Type.Null()])),
    sku: Type.Optional(
      Type.Union([Type.String({ maxLength: 50 }), Type.Null()]),
    ),
    prepTimeMinutes: Type.Optional(
      Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    ),
    sortOrder: Type.Optional(Type.Integer()),
    hsnCode: Type.Optional(
      Type.Union([Type.String({ maxLength: 20 }), Type.Null()]),
    ),
    status: Type.Optional(menuItemStatusSchema),
    enableRecipeDeduction: Type.Optional(Type.Boolean()),
    isPublished: Type.Optional(Type.Boolean()),
    displayMode: Type.Optional(menuItemDisplayModeSchema),
    effectiveFrom: Type.Optional(
      Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
    ),
    availabilityReason: Type.Optional(
      Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    ),
    variants: Type.Optional(Type.Array(menuItemVariantInputSchema)),
    modifierGroupIds: Type.Optional(Type.Array(uuidSchema)),
    tagIds: Type.Optional(Type.Array(uuidSchema)),
    allergenIds: Type.Optional(Type.Array(uuidSchema)),
    imageUrls: Type.Optional(Type.Array(Type.String({ maxLength: 500 }))),
  },
  { additionalProperties: false },
);

export const updateMenuItemBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
    description: Type.Optional(
      Type.Union([Type.String({ maxLength: 5000 }), Type.Null()]),
    ),
    basePrice: Type.Optional(Type.Number({ minimum: 0 })),
    manualCost: Type.Optional(
      Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    ),
    pricingMode: Type.Optional(pricingModeSchema),
    weightUnit: Type.Optional(Type.Union([weightUnitSchema, Type.Null()])),
    openPriceMin: Type.Optional(
      Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    ),
    openPriceMax: Type.Optional(
      Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    ),
    supportsZones: Type.Optional(Type.Boolean()),
    zonePricingRule: Type.Optional(zonePricingRuleSchema),
    manualStockCount: Type.Optional(
      Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    ),
    taxRate: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    taxMode: Type.Optional(Type.Union([menuTaxModeSchema, Type.Null()])),
    foodType: Type.Optional(foodTypeSchema),
    spiceLevel: Type.Optional(Type.Union([spiceLevelSchema, Type.Null()])),
    sku: Type.Optional(
      Type.Union([Type.String({ maxLength: 50 }), Type.Null()]),
    ),
    prepTimeMinutes: Type.Optional(
      Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    ),
    sortOrder: Type.Optional(Type.Integer()),
    hsnCode: Type.Optional(
      Type.Union([Type.String({ maxLength: 20 }), Type.Null()]),
    ),
    status: Type.Optional(menuItemStatusSchema),
    availabilityReason: Type.Optional(
      Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    ),
    enableRecipeDeduction: Type.Optional(Type.Boolean()),
    displayMode: Type.Optional(menuItemDisplayModeSchema),
    effectiveFrom: Type.Optional(
      Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
    ),
    tagIds: Type.Optional(Type.Array(uuidSchema)),
    allergenIds: Type.Optional(Type.Array(uuidSchema)),
    modifierGroupIds: Type.Optional(Type.Array(uuidSchema)),
    imageUrls: Type.Optional(Type.Array(Type.String({ maxLength: 500 }))),
    variants: Type.Optional(
      Type.Array(
        Type.Object(
          {
            id: Type.Optional(uuidSchema),
            name: Type.String({ minLength: 1, maxLength: 100 }),
            price: Type.Number({ minimum: 0 }),
          },
          { additionalProperties: false },
        ),
      ),
    ),
  },
  { additionalProperties: false, minProperties: 1 },
);

export const duplicateMenuItemBodySchema = Type.Optional(
  Type.Object(
    {
      name: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
      copyRecipes: Type.Optional(Type.Boolean()),
      copySchedules: Type.Optional(Type.Boolean()),
      copyModifiers: Type.Optional(Type.Boolean()),
    },
    { additionalProperties: false },
  ),
);

export const updateMenuItemStatusBodySchema = Type.Object(
  {
    status: menuItemStatusSchema,
    reason: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false },
);

export const updateMenuItemAvailabilityBodySchema = Type.Object(
  {
    isAvailable: Type.Boolean(),
    reason: Type.Optional(Type.String({ maxLength: 500 })),
  },
  { additionalProperties: false },
);

export const menuItemIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const menuItemStatusParamsSchema = Type.Object(
  { status: menuItemStatusSchema },
  { additionalProperties: false },
);
export const menuItemStatusQuerySchema = Type.Object(
  { categoryId: Type.Optional(uuidSchema) },
  { additionalProperties: false },
);

// Availability contracts
export const availabilityItemStatusSchema = menuItemStatusSchema;
export const availabilityScheduleTypeSchema = Type.Union([
  Type.Literal("DAILY"),
  Type.Literal("WEEKLY"),
  Type.Literal("SPECIFIC_DATE"),
  Type.Literal("HOLIDAY"),
]);
export const availabilityChannelSchema = Type.Union([
  Type.Literal("STAFF"),
  Type.Literal("CUSTOMER_QR"),
]);
export const availabilityFulfillmentTypeSchema = fulfillmentTypeSchema;
export const availabilityDashboardQuerySchema = Type.Object(
  {
    channel: Type.Optional(
      Type.Union([Type.Literal("UNSCOPED"), availabilityChannelSchema]),
    ),
    fulfillmentType: Type.Optional(
      Type.Union([Type.Literal("UNSCOPED"), availabilityFulfillmentTypeSchema]),
    ),
    cause: Type.Optional(Type.String({ maxLength: 100 })),
  },
  { additionalProperties: false },
);
export const createAvailabilityScheduleBodySchema = Type.Object(
  {
    scheduleType: availabilityScheduleTypeSchema,
    startTime: Type.Optional(Type.String({ maxLength: 20 })),
    endTime: Type.Optional(Type.String({ maxLength: 20 })),
    dayOfWeek: Type.Optional(Type.Integer({ minimum: 0, maximum: 6 })),
    startDate: Type.Optional(Type.String({ format: "date" })),
    endDate: Type.Optional(Type.String({ format: "date" })),
    holidayName: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    statusDuringPeriod: Type.Optional(availabilityItemStatusSchema),
    branchId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);
export const updateAvailabilityScheduleBodySchema = Type.Object(
  {
    startTime: Type.Optional(Type.String({ maxLength: 20 })),
    endTime: Type.Optional(Type.String({ maxLength: 20 })),
    dayOfWeek: Type.Optional(Type.Integer({ minimum: 0, maximum: 6 })),
    startDate: Type.Optional(Type.String({ format: "date" })),
    endDate: Type.Optional(Type.String({ format: "date" })),
    holidayName: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    statusDuringPeriod: Type.Optional(availabilityItemStatusSchema),
    branchId: Type.Optional(Type.Union([uuidSchema, Type.Null()])),
    isActive: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false, minProperties: 1 },
);
export const availabilityItemIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const availabilityScheduleIdParamsSchema = Type.Object(
  { scheduleId: uuidSchema },
  { additionalProperties: false },
);
export const availabilityItemBranchParamsSchema = Type.Object(
  { id: uuidSchema, branchId: uuidSchema },
  { additionalProperties: false },
);
export const availabilityCurrentStatusQuerySchema = Type.Object(
  {
    timestamp: Type.Optional(Type.String({ format: "date-time" })),
  },
  { additionalProperties: false },
);
export const availabilityHolidayQuerySchema = Type.Object(
  {
    year: Type.Optional(Type.String({ pattern: "^[0-9]{4}$" })),
    region: Type.Optional(Type.String({ maxLength: 100 })),
  },
  { additionalProperties: false },
);
export const createAvailabilityHolidayBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 255 }),
    holidayDate: Type.String({ format: "date" }),
    region: Type.Optional(Type.String({ maxLength: 100 })),
  },
  { additionalProperties: false },
);
export const updateAvailabilityHolidayBodySchema = Type.Object(
  {
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    holidayDate: Type.Optional(Type.String({ format: "date" })),
    region: Type.Optional(
      Type.Union([Type.String({ maxLength: 100 }), Type.Null()]),
    ),
  },
  { additionalProperties: false, minProperties: 1 },
);
export const availabilityHolidayIdParamsSchema = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
export const upsertAvailabilityBranchOverrideBodySchema = Type.Object(
  {
    price: Type.Optional(
      Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    ),
    taxRate: Type.Optional(
      Type.Union([Type.Number({ minimum: 0, maximum: 100 }), Type.Null()]),
    ),
    prepTimeMinutes: Type.Optional(
      Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    ),
    status: Type.Optional(
      Type.Union([availabilityItemStatusSchema, Type.Null()]),
    ),
    isHidden: Type.Optional(Type.Boolean()),
    availabilityReason: Type.Optional(
      Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    ),
  },
  { additionalProperties: false, minProperties: 1 },
);
export const availabilityChannelOverrideBodySchema = Type.Object(
  {
    channel: availabilityChannelSchema,
    fulfillmentType: Type.Optional(
      Type.Union([availabilityFulfillmentTypeSchema, Type.Null()]),
    ),
    status: Type.Optional(
      Type.Union([availabilityItemStatusSchema, Type.Null()]),
    ),
    isHidden: Type.Optional(Type.Boolean()),
    availabilityReason: Type.Optional(
      Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    ),
  },
  { additionalProperties: false, minProperties: 2 },
);
export const availabilityVariantOverrideBodySchema = Type.Object(
  {
    status: Type.Union([availabilityItemStatusSchema, Type.Null()]),
    reason: Type.Optional(
      Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
    ),
  },
  { additionalProperties: false },
);
export const availabilityStockCountBodySchema = Type.Object(
  {
    count: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    variantId: Type.Optional(Type.Union([uuidSchema, Type.Null()])),
  },
  { additionalProperties: false },
);
export const availabilityManualOverrideBodySchema = Type.Object(
  {
    status: availabilityItemStatusSchema,
    reason: Type.String({ minLength: 1, maxLength: 500 }),
  },
  { additionalProperties: false },
);

// Menu import/export contracts. Multipart File parsing remains API-framework specific.
export const menuExportFormatSchema = Type.Union([
  Type.Literal("csv"),
  Type.Literal("xlsx"),
]);
export const menuExportQuerySchema = Type.Object(
  {
    format: Type.Optional(menuExportFormatSchema),
  },
  { additionalProperties: false },
);
export const menuExportItemsQuerySchema = Type.Object(
  {
    format: Type.Optional(menuExportFormatSchema),
    branchId: Type.Optional(uuidSchema),
  },
  { additionalProperties: false },
);
