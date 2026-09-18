import { Type, type Static } from "@sinclair/typebox";
import { isoDateTimeSchema } from "../common/dates";
import { uuidSchema } from "../common/ids";
import { successResponseSchema } from "../common/responses";
import {
  fulfillmentTypeSchema,
  menuChannelSchema,
  menuScheduleTypeSchema,
} from "./requests";

const nullableUuid = Type.Union([uuidSchema, Type.Null()]);
const nullableString = Type.Union([Type.String(), Type.Null()]);

export const menuStatusSchema = Type.Union([
  Type.Literal("DRAFT"),
  Type.Literal("PUBLISHED"),
]);

export const menuMembershipSummarySchema = Type.Object(
  {
    id: Type.String(),
    menuId: uuidSchema,
    menuItemId: uuidSchema,
    categoryId: uuidSchema,
    sortOrder: Type.Integer(),
  },
  { additionalProperties: false },
);

export const menuSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: nullableUuid,
    organizationId: nullableUuid,
    name: Type.String(),
    description: nullableString,
    status: menuStatusSchema,
    isDefault: Type.Boolean(),
    availableChannels: Type.Union([Type.Array(menuChannelSchema), Type.Null()]),
    availableFulfillmentTypes: Type.Union([
      Type.Array(fulfillmentTypeSchema),
      Type.Null(),
    ]),
    availableBranchIds: Type.Union([Type.Array(uuidSchema), Type.Null()]),
    effectiveFrom: Type.Union([isoDateTimeSchema, Type.Null()]),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const activeMenuSchema = Type.Intersect([
  menuSchema,
  Type.Object({ memberships: Type.Array(menuMembershipSummarySchema) }),
]);

export const menuScheduleSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    menuId: uuidSchema,
    scheduleType: menuScheduleTypeSchema,
    startTime: nullableString,
    endTime: nullableString,
    dayOfWeek: Type.Union([
      Type.Integer({ minimum: 0, maximum: 6 }),
      Type.Null(),
    ]),
    startDate: nullableString,
    endDate: nullableString,
    holidayName: nullableString,
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);

export const menuResponseSchema = successResponseSchema(menuSchema);
export const menuListResponseSchema = successResponseSchema(
  Type.Array(menuSchema),
);
export const activeMenuListResponseSchema = successResponseSchema(
  Type.Array(activeMenuSchema),
);
export const menuScheduleResponseSchema =
  successResponseSchema(menuScheduleSchema);
export const menuScheduleListResponseSchema = successResponseSchema(
  Type.Array(menuScheduleSchema),
);

export type MenuResponse = Static<typeof menuSchema>;
export type ActiveMenuResponse = Static<typeof activeMenuSchema>;
export type MenuScheduleResponse = Static<typeof menuScheduleSchema>;

const menuItemStatusResponseSchema = Type.Union([
  Type.Literal("ACTIVE"),
  Type.Literal("OUT_OF_STOCK"),
  Type.Literal("HIDDEN"),
  Type.Literal("SEASONAL"),
  Type.Literal("DISCONTINUED"),
]);
const foodTypeResponseSchema = Type.Union([
  Type.Literal("VEG"),
  Type.Literal("NON_VEG"),
  Type.Literal("EGG"),
]);
const spiceLevelResponseSchema = Type.Union([
  Type.Literal("NONE"),
  Type.Literal("MILD"),
  Type.Literal("MEDIUM"),
  Type.Literal("HOT"),
]);

export const menuItemVariantSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    name: Type.String(),
    price: Type.Number(),
    status: menuItemStatusResponseSchema,
    manualOverrideStatus: Type.Union([
      menuItemStatusResponseSchema,
      Type.Null(),
    ]),
    manualOverrideReason: nullableString,
    manualStockCount: Type.Union([Type.Integer(), Type.Null()]),
    manualStockCountUpdatedAt: Type.Union([isoDateTimeSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

export const menuItemImageSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    url: Type.String(),
    sortOrder: Type.Integer(),
  },
  { additionalProperties: false },
);

export const menuTagSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String(),
    color: nullableString,
  },
  { additionalProperties: false },
);
export const menuAllergenSchema = Type.Object(
  { id: uuidSchema, name: Type.String() },
  { additionalProperties: false },
);

export const modifierOptionVariantPriceSchema = Type.Object(
  {
    id: uuidSchema,
    variantId: uuidSchema,
    additionalPrice: Type.Number(),
  },
  { additionalProperties: false },
);

export const modifierOptionSchema = Type.Object(
  {
    id: uuidSchema,
    modifierGroupId: uuidSchema,
    name: Type.String(),
    additionalPrice: Type.Number(),
    isAvailable: Type.Boolean(),
    computedAvailability: Type.Boolean(),
    manualOverrideAvailability: Type.Union([Type.Boolean(), Type.Null()]),
    maxQuantity: Type.Integer(),
    sortOrder: Type.Integer(),
    isDefault: Type.Boolean(),
    replacesDefaultComponent: nullableString,
    variantPrices: Type.Array(modifierOptionVariantPriceSchema),
  },
  { additionalProperties: false },
);

export const modifierGroupSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: nullableUuid,
    name: Type.String(),
    selectionType: Type.Union([
      Type.Literal("SINGLE"),
      Type.Literal("MULTIPLE"),
    ]),
    groupType: Type.Union([
      Type.Literal("ADDON"),
      Type.Literal("SUBSTITUTION"),
    ]),
    minSelections: Type.Integer(),
    maxSelections: Type.Union([Type.Integer(), Type.Null()]),
    sortOrder: Type.Integer(),
    dependsOnOptionId: nullableUuid,
    options: Type.Array(modifierOptionSchema),
  },
  { additionalProperties: false },
);

export const menuItemModifierGroupLinkSchema = Type.Object(
  {
    modifierGroupId: uuidSchema,
    sortOrder: Type.Integer(),
    group: modifierGroupSchema,
  },
  { additionalProperties: false },
);
export const menuItemTagLinkSchema = Type.Object(
  { tagId: uuidSchema, tag: menuTagSchema },
  { additionalProperties: false },
);
export const menuItemAllergenLinkSchema = Type.Object(
  { allergenId: uuidSchema, allergen: menuAllergenSchema },
  { additionalProperties: false },
);
export const menuItemMembershipSchema = Type.Object(
  {
    id: uuidSchema,
    menuId: uuidSchema,
    menuItemId: uuidSchema,
    categoryId: uuidSchema,
    sortOrder: Type.Integer(),
  },
  { additionalProperties: false },
);

export const menuItemRecipeLinkSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    inventoryItemId: nullableUuid,
    subRecipeId: nullableUuid,
    variantId: nullableUuid,
    modifierOptionId: nullableUuid,
    quantityRequired: Type.Number(),
    unit: Type.Union([
      Type.Literal("KG"),
      Type.Literal("GRAMS"),
      Type.Literal("LITERS"),
      Type.Literal("ML"),
      Type.Literal("PIECES"),
      Type.Literal("PACKETS"),
    ]),
    yieldPercent: Type.Union([Type.Number(), Type.Null()]),
    isOptional: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const menuItemSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: nullableUuid,
    categoryId: uuidSchema,
    name: Type.String(),
    description: nullableString,
    basePrice: Type.Number(),
    manualCost: Type.Union([Type.Number(), Type.Null()]),
    pricingMode: Type.Union([
      Type.Literal("FIXED"),
      Type.Literal("WEIGHT_BASED"),
      Type.Literal("OPEN"),
    ]),
    weightUnit: Type.Union([
      Type.Literal("G"),
      Type.Literal("KG"),
      Type.Literal("LB"),
      Type.Literal("OZ"),
      Type.Null(),
    ]),
    openPriceMin: Type.Union([Type.Number(), Type.Null()]),
    openPriceMax: Type.Union([Type.Number(), Type.Null()]),
    supportsZones: Type.Boolean(),
    zonePricingRule: Type.Union([
      Type.Literal("AVERAGE"),
      Type.Literal("HIGHER"),
      Type.Literal("SUM_HALF"),
    ]),
    manualStockCount: Type.Union([Type.Integer(), Type.Null()]),
    manualStockCountUpdatedAt: Type.Union([isoDateTimeSchema, Type.Null()]),
    taxRate: Type.Number(),
    taxMode: Type.Union([
      Type.Literal("INCLUSIVE"),
      Type.Literal("EXCLUSIVE"),
      Type.Null(),
    ]),
    isAvailable: Type.Boolean(),
    imageUrl: nullableString,
    foodType: foodTypeResponseSchema,
    spiceLevel: Type.Union([spiceLevelResponseSchema, Type.Null()]),
    sku: nullableString,
    prepTimeMinutes: Type.Union([Type.Integer(), Type.Null()]),
    sortOrder: Type.Integer(),
    hsnCode: nullableString,
    status: menuItemStatusResponseSchema,
    availabilityReason: nullableString,
    statusChangedAt: isoDateTimeSchema,
    manualOverrideStatus: Type.Union([
      menuItemStatusResponseSchema,
      Type.Null(),
    ]),
    manualOverrideReason: nullableString,
    manualOverrideSetBy: nullableUuid,
    manualOverrideSetAt: Type.Union([isoDateTimeSchema, Type.Null()]),
    enableRecipeDeduction: Type.Boolean(),
    displayMode: Type.Union([
      Type.Literal("STANDARD"),
      Type.Literal("GUIDED_BUILDER"),
    ]),
    effectiveFrom: Type.Union([isoDateTimeSchema, Type.Null()]),
    isPublished: Type.Boolean(),
    publishedAt: Type.Union([isoDateTimeSchema, Type.Null()]),
    variants: Type.Array(menuItemVariantSchema),
    images: Type.Array(menuItemImageSchema),
    modifierGroupLinks: Type.Array(menuItemModifierGroupLinkSchema),
    tagLinks: Type.Array(menuItemTagLinkSchema),
    allergenLinks: Type.Array(menuItemAllergenLinkSchema),
    recipeLinks: Type.Array(menuItemRecipeLinkSchema),
    menuMemberships: Type.Array(menuItemMembershipSchema),
  },
  { additionalProperties: false },
);

export const menuItemResponseSchema = successResponseSchema(menuItemSchema);
export const menuItemListResponseSchema = successResponseSchema(
  Type.Array(menuItemSchema),
);

export type MenuItemResponse = Static<typeof menuItemSchema>;

// Availability response contracts
const availabilityStatusSchema = menuItemStatusResponseSchema;
const availabilityChannelResponseSchema = Type.Union([
  Type.Literal("STAFF"),
  Type.Literal("CUSTOMER_QR"),
]);
const availabilityFulfillmentResponseSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
  Type.Literal("DELIVERY"),
  Type.Literal("ONLINE"),
]);
const availabilityCauseSchema = Type.Union([
  Type.Literal("MANUAL_OVERRIDE"),
  Type.Literal("MANUAL_COUNT"),
  Type.Literal("CHANNEL_OVERRIDE"),
  Type.Literal("BRANCH_OVERRIDE"),
  Type.Literal("SCHEDULE"),
  Type.Literal("RECIPE_DRIVEN"),
  Type.Literal("BASE_STATUS"),
  Type.Literal("COMPUTED_STATUS"),
]);
export const availabilityDashboardRowSchema = Type.Object(
  {
    entityType: Type.Union([
      Type.Literal("ITEM"),
      Type.Literal("VARIANT"),
      Type.Literal("MODIFIER_OPTION"),
    ]),
    entityId: uuidSchema,
    menuItemId: uuidSchema,
    name: Type.String(),
    status: availabilityStatusSchema,
    reason: Type.String(),
    cause: Type.String(),
    branchId: uuidSchema,
    branchName: Type.String(),
    channel: availabilityChannelResponseSchema,
    fulfillmentType: availabilityFulfillmentResponseSchema,
  },
  { additionalProperties: false },
);
export const availabilityDashboardSchema = Type.Object(
  {
    asOf: isoDateTimeSchema,
    branches: Type.Array(uuidSchema),
    channels: Type.Array(availabilityChannelResponseSchema),
    fulfillmentTypes: Type.Array(availabilityFulfillmentResponseSchema),
    rows: Type.Array(availabilityDashboardRowSchema),
  },
  { additionalProperties: false },
);
export const availabilityDashboardResponseSchema = successResponseSchema(
  availabilityDashboardSchema,
);

export const availabilityScheduleSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    menuItemId: uuidSchema,
    branchId: nullableUuid,
    scheduleType: Type.Union([
      Type.Literal("DAILY"),
      Type.Literal("WEEKLY"),
      Type.Literal("SPECIFIC_DATE"),
      Type.Literal("HOLIDAY"),
    ]),
    startTime: nullableString,
    endTime: nullableString,
    dayOfWeek: Type.Union([Type.Integer(), Type.Null()]),
    startDate: nullableString,
    endDate: nullableString,
    holidayName: nullableString,
    statusDuringPeriod: availabilityStatusSchema,
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const availabilityScheduleResponseSchema = successResponseSchema(
  availabilityScheduleSchema,
);
export const availabilityScheduleListResponseSchema = successResponseSchema(
  Type.Array(availabilityScheduleSchema),
);

export const availabilityHolidaySchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String(),
    holidayDate: Type.String({ format: "date" }),
    region: nullableString,
  },
  { additionalProperties: false },
);
export const availabilityHolidayResponseSchema = successResponseSchema(
  availabilityHolidaySchema,
);
export const availabilityHolidayListResponseSchema = successResponseSchema(
  Type.Array(availabilityHolidaySchema),
);

export const availabilityCurrentStatusSchema = Type.Object(
  {
    status: availabilityStatusSchema,
    reason: Type.String(),
  },
  { additionalProperties: false },
);
export const availabilityCurrentStatusResponseSchema = successResponseSchema(
  availabilityCurrentStatusSchema,
);

export const availabilityStockCountSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    entityType: Type.Union([Type.Literal("ITEM"), Type.Literal("VARIANT")]),
    manualStockCount: Type.Union([Type.Integer(), Type.Null()]),
    manualStockCountUpdatedAt: Type.Union([isoDateTimeSchema, Type.Null()]),
  },
  { additionalProperties: false },
);
export const availabilityStockCountResponseSchema = successResponseSchema(
  availabilityStockCountSchema,
);

export const availabilityVariantOverrideSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    status: availabilityStatusSchema,
    manualOverrideStatus: Type.Union([availabilityStatusSchema, Type.Null()]),
    manualOverrideReason: nullableString,
  },
  { additionalProperties: false },
);
export const availabilityVariantOverrideResponseSchema = successResponseSchema(
  availabilityVariantOverrideSchema,
);

export const availabilityItemStateSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: nullableUuid,
    status: availabilityStatusSchema,
    availabilityReason: nullableString,
    manualOverrideStatus: Type.Union([availabilityStatusSchema, Type.Null()]),
    manualOverrideReason: nullableString,
    manualOverrideSetBy: nullableUuid,
    manualOverrideSetAt: Type.Union([isoDateTimeSchema, Type.Null()]),
    manualStockCount: Type.Union([Type.Integer(), Type.Null()]),
    manualStockCountUpdatedAt: Type.Union([isoDateTimeSchema, Type.Null()]),
  },
  { additionalProperties: false },
);
export const availabilityItemStateResponseSchema = successResponseSchema(
  availabilityItemStateSchema,
);

export const availabilityBranchOverrideSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    menuItemId: uuidSchema,
    branchId: uuidSchema,
    price: Type.Union([Type.Number(), Type.Null()]),
    taxRate: Type.Union([Type.Number(), Type.Null()]),
    prepTimeMinutes: Type.Union([Type.Integer(), Type.Null()]),
    status: Type.Union([availabilityStatusSchema, Type.Null()]),
    isHidden: Type.Boolean(),
    availabilityReason: nullableString,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const availabilityBranchOverrideResponseSchema = successResponseSchema(
  availabilityBranchOverrideSchema,
);
export const availabilityBranchOverrideListResponseSchema =
  successResponseSchema(Type.Array(availabilityBranchOverrideSchema));

export const availabilityChannelOverrideSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    menuItemId: uuidSchema,
    channel: availabilityChannelResponseSchema,
    fulfillmentType: Type.Union([
      availabilityFulfillmentResponseSchema,
      Type.Null(),
    ]),
    status: Type.Union([availabilityStatusSchema, Type.Null()]),
    isHidden: Type.Boolean(),
    availabilityReason: nullableString,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const availabilityChannelOverrideResponseSchema = successResponseSchema(
  availabilityChannelOverrideSchema,
);
export const availabilityChannelOverrideListResponseSchema =
  successResponseSchema(Type.Array(availabilityChannelOverrideSchema));

export const effectiveAvailabilityItemSchema = Type.Object(
  {
    id: uuidSchema,
    branchId: nullableUuid,
    status: availabilityStatusSchema,
    basePrice: Type.Number(),
    taxRate: Type.Number(),
    prepTimeMinutes: Type.Union([Type.Integer(), Type.Null()]),
    manualOverrideStatus: Type.Union([availabilityStatusSchema, Type.Null()]),
    manualOverrideReason: nullableString,
    manualStockCount: Type.Union([Type.Integer(), Type.Null()]),
    effectivePrice: Type.Number(),
    effectiveTaxRate: Type.Number(),
    effectivePrepTimeMinutes: Type.Union([Type.Integer(), Type.Null()]),
    effectiveStatus: availabilityStatusSchema,
    isHidden: Type.Boolean(),
    availabilityReason: Type.String(),
    availabilityCause: availabilityCauseSchema,
    overrideApplied: Type.Boolean(),
  },
  { additionalProperties: false },
);
export const effectiveAvailabilityItemResponseSchema = successResponseSchema(
  effectiveAvailabilityItemSchema,
);

export const availabilityNullSuccessResponseSchema = successResponseSchema(
  Type.Null(),
);

export type AvailabilityDashboardResponse = Static<
  typeof availabilityDashboardSchema
>;
export type AvailabilityScheduleResponse = Static<
  typeof availabilityScheduleSchema
>;
export type AvailabilityHolidayResponse = Static<
  typeof availabilityHolidaySchema
>;
export type AvailabilityStockCountResponse = Static<
  typeof availabilityStockCountSchema
>;
export type AvailabilityVariantOverrideResponse = Static<
  typeof availabilityVariantOverrideSchema
>;
export type AvailabilityItemStateResponse = Static<
  typeof availabilityItemStateSchema
>;
export type AvailabilityBranchOverrideResponse = Static<
  typeof availabilityBranchOverrideSchema
>;
export type AvailabilityChannelOverrideResponse = Static<
  typeof availabilityChannelOverrideSchema
>;
export type EffectiveAvailabilityItemResponse = Static<
  typeof effectiveAvailabilityItemSchema
>;

// Menu import/export JSON response contracts. Binary export endpoints are declared separately at the route boundary.
export const menuImportRowErrorSchema = Type.Object(
  {
    row: Type.Integer({ minimum: 1 }),
    field: Type.Optional(Type.String()),
    message: Type.String(),
  },
  { additionalProperties: false },
);

export const menuImportValidatedItemDataSchema = Type.Object(
  {
    id: Type.Optional(uuidSchema),
    categoryId: uuidSchema,
    name: Type.String(),
    description: nullableString,
    basePrice: Type.String(),
    taxRate: Type.String(),
    foodType: foodTypeResponseSchema,
    spiceLevel: Type.Union([spiceLevelResponseSchema, Type.Null()]),
    sku: nullableString,
    status: menuItemStatusResponseSchema,
    hsnCode: nullableString,
    prepTimeMinutes: Type.Union([Type.Integer(), Type.Null()]),
  },
  { additionalProperties: false },
);
export const menuImportValidatedRowSchema = Type.Object(
  {
    row: Type.Integer({ minimum: 1 }),
    action: Type.Union([Type.Literal("insert"), Type.Literal("update")]),
    data: menuImportValidatedItemDataSchema,
  },
  { additionalProperties: false },
);
export const menuImportValidationResultSchema = Type.Object(
  {
    totalRows: Type.Integer({ minimum: 0 }),
    validCount: Type.Integer({ minimum: 0 }),
    preview: Type.Array(menuImportValidatedRowSchema),
    errors: Type.Array(menuImportRowErrorSchema),
  },
  { additionalProperties: false },
);
export const menuImportCommitResultSchema = Type.Object(
  {
    inserted: Type.Integer({ minimum: 0 }),
    updated: Type.Integer({ minimum: 0 }),
    errors: Type.Array(menuImportRowErrorSchema),
  },
  { additionalProperties: false },
);
export const menuImportValidationResponseSchema = successResponseSchema(
  menuImportValidationResultSchema,
);
export const menuImportCommitResponseSchema = successResponseSchema(
  menuImportCommitResultSchema,
);

export type MenuImportValidationResult = Static<
  typeof menuImportValidationResultSchema
>;
export type MenuImportCommitResult = Static<
  typeof menuImportCommitResultSchema
>;
export const menuBinaryFileResponseSchema = Type.Any();

export const menuCategorySchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: nullableUuid,
    name: Type.String(),
    description: nullableString,
    sortOrder: Type.Integer(),
    isActive: Type.Boolean(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    menuItems: Type.Optional(Type.Array(menuItemSchema)),
  },
  { additionalProperties: false },
);
export const menuCategoryResponseSchema =
  successResponseSchema(menuCategorySchema);
export const menuCategoryListResponseSchema = successResponseSchema(
  Type.Array(menuCategorySchema),
);
export type MenuCategoryResponse = Static<typeof menuCategorySchema>;

// Residual menu-domain response contracts
export const modifierGroupResponseSchema =
  successResponseSchema(modifierGroupSchema);
export const modifierGroupListResponseSchema = successResponseSchema(
  Type.Array(modifierGroupSchema),
);
export const modifierOptionResponseSchema =
  successResponseSchema(modifierOptionSchema);
export const menuTagResponseSchema = successResponseSchema(menuTagSchema);
export const menuTagListResponseSchema = successResponseSchema(
  Type.Array(menuTagSchema),
);
export const menuAllergenListResponseSchema = successResponseSchema(
  Type.Array(menuAllergenSchema),
);
export const menuNullResponseSchema = successResponseSchema(Type.Null());

export const bulkOperationResultSchema = Type.Object(
  { updated: Type.Integer({ minimum: 0 }) },
  { additionalProperties: false },
);
export const bulkPriceChangeSchema = Type.Object(
  {
    itemId: uuidSchema,
    oldPrice: Type.Number(),
    newPrice: Type.Number(),
  },
  { additionalProperties: false },
);
export const bulkPriceOperationResultSchema = Type.Object(
  {
    updated: Type.Integer({ minimum: 0 }),
    changes: Type.Array(bulkPriceChangeSchema),
  },
  { additionalProperties: false },
);
export const bulkOperationResponseSchema = successResponseSchema(
  bulkOperationResultSchema,
);
export const bulkPriceOperationResponseSchema = successResponseSchema(
  bulkPriceOperationResultSchema,
);
export const bulkDeleteResultSchema = Type.Object(
  {
    deleted: Type.Integer({ minimum: 0 }),
    protected: Type.Integer({ minimum: 0 }),
  },
  { additionalProperties: false },
);
export const bulkDeleteResponseSchema = successResponseSchema(
  bulkDeleteResultSchema,
);

export type ModifierGroupResponse = Static<typeof modifierGroupSchema>;
export type ModifierOptionResponse = Static<typeof modifierOptionSchema>;
export type MenuTagResponse = Static<typeof menuTagSchema>;
export type MenuAllergenResponse = Static<typeof menuAllergenSchema>;

export const menuMembershipResponseSchema = successResponseSchema(
  menuItemMembershipSchema,
);
export const menuMembershipListResponseSchema = successResponseSchema(
  Type.Array(menuItemMembershipSchema),
);

export const menuChangeEntityTypeSchema = Type.Union([
  Type.Literal("MENU_ITEM"),
  Type.Literal("VARIANT"),
  Type.Literal("MODIFIER_GROUP"),
  Type.Literal("MODIFIER_OPTION"),
  Type.Literal("CATEGORY"),
  Type.Literal("MENU"),
  Type.Literal("MENU_MEMBERSHIP"),
  Type.Literal("PRICE_RULE"),
  Type.Literal("PROMOTION"),
  Type.Literal("RECIPE"),
  Type.Literal("SUB_RECIPE"),
  Type.Literal("TEMPLATE"),
  Type.Literal("AVAILABILITY"),
  Type.Literal("TAG"),
]);
export const menuChangeTypeSchema = Type.Union([
  Type.Literal("CREATED"),
  Type.Literal("UPDATED"),
  Type.Literal("PUBLISHED"),
  Type.Literal("ARCHIVED"),
  Type.Literal("DELETED"),
]);
export const menuChangeEventSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    changedBy: nullableUuid,
    entityType: menuChangeEntityTypeSchema,
    entityId: uuidSchema,
    changeType: menuChangeTypeSchema,
    diff: Type.Unknown(),
    changedAt: isoDateTimeSchema,
  },
  { additionalProperties: false },
);
export const menuChangeEventListResponseSchema = successResponseSchema(
  Type.Array(menuChangeEventSchema),
);

export const inventoryUnitResponseSchema = Type.Union([
  Type.Literal("KG"),
  Type.Literal("GRAMS"),
  Type.Literal("LITERS"),
  Type.Literal("ML"),
  Type.Literal("PIECES"),
  Type.Literal("PACKETS"),
]);
export const recipeInventoryItemSummarySchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    name: Type.String(),
    unit: inventoryUnitResponseSchema,
    currentStock: Type.Number(),
    minimumStock: Type.Number(),
    reorderPoint: Type.Number(),
    costPerUnit: Type.Number(),
    isActive: Type.Boolean(),
  },
  { additionalProperties: false },
);
export const recipeSubRecipeSummarySchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    name: Type.String(),
    yieldQuantity: Type.Number(),
    yieldUnit: inventoryUnitResponseSchema,
    yieldPercent: Type.Union([Type.Number(), Type.Null()]),
  },
  { additionalProperties: false },
);
export const recipeSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    inventoryItemId: nullableUuid,
    subRecipeId: nullableUuid,
    variantId: nullableUuid,
    modifierOptionId: nullableUuid,
    quantityRequired: Type.Number({ exclusiveMinimum: 0 }),
    unit: inventoryUnitResponseSchema,
    yieldPercent: Type.Union([Type.Number(), Type.Null()]),
    isOptional: Type.Boolean(),
    inventoryItem: Type.Union([recipeInventoryItemSummarySchema, Type.Null()]),
    subRecipe: Type.Union([recipeSubRecipeSummarySchema, Type.Null()]),
    variant: Type.Union([
      Type.Object(
        { id: uuidSchema, name: Type.String() },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
    modifierOption: Type.Union([
      Type.Object(
        { id: uuidSchema, name: Type.String() },
        { additionalProperties: false },
      ),
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);
export const recipeListResponseSchema = successResponseSchema(
  Type.Array(recipeSchema),
);

export const subRecipeIngredientSchema = Type.Object(
  {
    id: uuidSchema,
    subRecipeId: uuidSchema,
    inventoryItemId: nullableUuid,
    ingredientSubRecipeId: nullableUuid,
    quantityRequired: Type.Number({ exclusiveMinimum: 0 }),
    unit: inventoryUnitResponseSchema,
    inventoryItem: Type.Union([recipeInventoryItemSummarySchema, Type.Null()]),
    ingredientSubRecipe: Type.Union([
      recipeSubRecipeSummarySchema,
      Type.Null(),
    ]),
  },
  { additionalProperties: false },
);
export const subRecipeSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    branchId: uuidSchema,
    name: Type.String(),
    yieldQuantity: Type.Number({ exclusiveMinimum: 0 }),
    yieldUnit: inventoryUnitResponseSchema,
    yieldPercent: Type.Union([Type.Number(), Type.Null()]),
    ingredients: Type.Array(subRecipeIngredientSchema),
  },
  { additionalProperties: false },
);
export const subRecipeResponseSchema = successResponseSchema(subRecipeSchema);
export const subRecipeListResponseSchema = successResponseSchema(
  Type.Array(subRecipeSchema),
);
export const deletedResultSchema = Type.Object(
  { deleted: Type.Boolean() },
  { additionalProperties: false },
);
export const deletedResponseSchema = successResponseSchema(deletedResultSchema);

export type RecipeResponse = Static<typeof recipeSchema>;
export type SubRecipeResponse = Static<typeof subRecipeSchema>;
export type MenuMembershipResponse = Static<typeof menuItemMembershipSchema>;

export type MenuChangeEventResponse = Static<typeof menuChangeEventSchema>;

// Final menu contract boundaries: combos, price rules, promotions and templates.
export const comboOptionResponseSchema = Type.Object(
  {
    id: uuidSchema,
    menuItemId: uuidSchema,
    variantId: nullableUuid,
    upcharge: Type.Number(),
    isUnlimitedRefill: Type.Boolean(),
  },
  { additionalProperties: false },
);
export const comboSlotResponseSchema = Type.Object(
  {
    id: uuidSchema,
    name: Type.String(),
    minSelections: Type.Integer({ minimum: 0 }),
    maxSelections: Type.Integer({ minimum: 1 }),
    sortOrder: Type.Integer(),
    options: Type.Array(comboOptionResponseSchema),
  },
  { additionalProperties: false },
);
export const comboResponseSchemaModel = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String(),
    description: nullableString,
    pricePolicy: Type.Union([
      Type.Literal("FIXED"),
      Type.Literal("PERCENT_OFF_SUM"),
    ]),
    fixedPrice: Type.Union([Type.Number(), Type.Null()]),
    percentOff: Type.Union([Type.Number(), Type.Null()]),
    status: menuItemStatusResponseSchema,
    slots: Type.Array(comboSlotResponseSchema),
  },
  { additionalProperties: false },
);

const pricingAttributionPreviewSchema = Type.Object(
  {
    BASE_PRICE: Type.Number(),
    VARIANT: Type.Number(),
    MODIFIER: Type.Number(),
    COMBO: Type.Optional(Type.Number()),
    PROMOTION: Type.Optional(Type.Number()),
    LOYALTY: Type.Optional(Type.Number()),
    TAXABLE_BASE: Type.Optional(Type.Number()),
    CATEGORY_ID: Type.Optional(Type.String()),
  },
  { additionalProperties: true },
);
const pricingPreviewModifierSchema = Type.Object(
  {
    modifierId: Type.String(),
    modifierGroupName: Type.String(),
    name: Type.String(),
    price: Type.Number(),
    quantity: Type.Integer({ minimum: 1 }),
    zoneLabel: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export const pricingPreviewLineSchema = Type.Object(
  {
    menuItemId: Type.Union([uuidSchema, Type.String(), Type.Null()]),
    menuItemName: Type.String(),
    variantId: Type.Optional(Type.String()),
    variantName: Type.Optional(Type.String()),
    quantity: Type.Number({ exclusiveMinimum: 0 }),
    unitPrice: Type.Number(),
    subtotal: Type.Number(),
    taxRate: Type.Number(),
    taxMode: Type.Optional(
      Type.Union([Type.Literal("INCLUSIVE"), Type.Literal("EXCLUSIVE")]),
    ),
    chefNotes: Type.Optional(Type.String()),
    seatLabel: Type.Optional(Type.String()),
    courseNumber: Type.Optional(Type.Integer()),
    fulfillmentType: Type.Union([
      Type.Literal("DINE_IN"),
      Type.Literal("TAKEAWAY"),
    ]),
    modifiers: Type.Array(pricingPreviewModifierSchema),
    pricingAttribution: pricingAttributionPreviewSchema,
  },
  { additionalProperties: true },
);
export const comboPreviewSchema = Type.Object(
  {
    componentTotal: Type.Number(),
    upcharges: Type.Number(),
    resolvedTotal: Type.Number(),
    lines: Type.Array(pricingPreviewLineSchema),
    selections: Type.Array(
      Type.Object(
        {
          slotId: Type.String(),
          optionIds: Type.Array(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export const comboResponseSchema = successResponseSchema(
  comboResponseSchemaModel,
);
export const comboListResponseSchema = successResponseSchema(
  Type.Array(comboResponseSchemaModel),
);
export const comboPreviewResponseSchema =
  successResponseSchema(comboPreviewSchema);

const priceRuleChannelSchema = Type.Union([
  Type.Literal("STAFF"),
  Type.Literal("CUSTOMER_QR"),
  Type.Null(),
]);
const priceRuleFulfillmentSchema = Type.Union([
  Type.Literal("DINE_IN"),
  Type.Literal("TAKEAWAY"),
  Type.Literal("DELIVERY"),
  Type.Literal("ONLINE"),
  Type.Null(),
]);
export const priceRuleResponseModelSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: nullableUuid,
    organizationId: nullableUuid,
    menuItemId: nullableUuid,
    menuItemSku: nullableString,
    variantId: nullableUuid,
    branchId: nullableUuid,
    channel: priceRuleChannelSchema,
    fulfillmentType: priceRuleFulfillmentSchema,
    customerGroupId: nullableUuid,
    coverTier: Type.Union([
      Type.Literal("ADULT"),
      Type.Literal("CHILD"),
      Type.Null(),
    ]),
    isPerCover: Type.Boolean(),
    startDate: nullableString,
    endDate: nullableString,
    startTime: nullableString,
    endTime: nullableString,
    price: nullableString,
    percentOff: nullableString,
    taxRate: nullableString,
    priority: Type.Integer(),
    isActive: Type.Boolean(),
    effectiveFrom: Type.Union([isoDateTimeSchema, Type.Null()]),
  },
  { additionalProperties: false },
);
export const priceRuleResponseSchema = successResponseSchema(
  priceRuleResponseModelSchema,
);
export const priceRuleListResponseSchema = successResponseSchema(
  Type.Array(priceRuleResponseModelSchema),
);

export const promotionResponseModelSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String(),
    ruleType: Type.Union([
      Type.Literal("PERCENTAGE"),
      Type.Literal("FIXED_AMOUNT"),
      Type.Literal("BOGO"),
    ]),
    scope: Type.Union([
      Type.Literal("ORDER"),
      Type.Literal("CATEGORY"),
      Type.Literal("ITEM"),
    ]),
    scopeCategoryId: nullableUuid,
    scopeMenuItemId: nullableUuid,
    value: nullableString,
    couponCode: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    startTime: nullableString,
    endTime: nullableString,
    maxUsesTotal: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    maxUsesPerCustomer: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]),
    triggerMenuItemId: nullableUuid,
    triggerCategoryId: nullableUuid,
    rewardMenuItemId: nullableUuid,
    rewardCategoryId: nullableUuid,
    rewardDiscountPercent: nullableString,
    triggerQuantity: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    rewardQuantity: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
    stackableWithLoyalty: Type.Boolean(),
    isActive: Type.Boolean(),
  },
  { additionalProperties: false },
);
export const promotionStatsSchema = Type.Object(
  {
    uses: Type.Integer({ minimum: 0 }),
    discountAmount: Type.String(),
  },
  { additionalProperties: false },
);
export const promotionPreviewSchema = Type.Object(
  {
    asOf: isoDateTimeSchema,
    subtotal: Type.Number(),
    discountAmount: Type.Number(),
    taxAmount: Type.Number(),
    serviceChargeAmount: Type.Number(),
    roundingAdjustment: Type.Number(),
    totalAmount: Type.Number(),
    lines: Type.Array(pricingPreviewLineSchema),
  },
  { additionalProperties: false },
);
export const promotionResponseSchema = successResponseSchema(
  promotionResponseModelSchema,
);
export const promotionListResponseSchema = successResponseSchema(
  Type.Array(promotionResponseModelSchema),
);
export const promotionStatsResponseSchema =
  successResponseSchema(promotionStatsSchema);
export const promotionPreviewResponseSchema = successResponseSchema(
  promotionPreviewSchema,
);

export const menuTemplateItemResponseSchema = Type.Object(
  {
    id: uuidSchema,
    templateId: uuidSchema,
    name: Type.String(),
    description: nullableString,
    basePrice: Type.Number(),
    taxRate: Type.Number(),
    foodType: foodTypeResponseSchema,
    spiceLevel: Type.Union([spiceLevelResponseSchema, Type.Null()]),
    prepTimeMinutes: Type.Union([Type.Integer(), Type.Null()]),
    hsnCode: nullableString,
    sortOrder: Type.Integer(),
  },
  { additionalProperties: false },
);
export const menuTemplateResponseModelSchema = Type.Object(
  {
    id: uuidSchema,
    tenantId: uuidSchema,
    name: Type.String(),
    description: nullableString,
    sourceCategoryName: nullableString,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    items: Type.Array(menuTemplateItemResponseSchema),
  },
  { additionalProperties: false },
);
export const menuTemplateApplyResultSchema = Type.Object(
  {
    category: Type.Object(
      { id: uuidSchema, name: Type.String() },
      { additionalProperties: false },
    ),
    items: Type.Array(
      Type.Object(
        { id: uuidSchema, name: Type.String() },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
export const menuTemplateResponseSchema = successResponseSchema(
  menuTemplateResponseModelSchema,
);
export const menuTemplateListResponseSchema = successResponseSchema(
  Type.Array(menuTemplateResponseModelSchema),
);
export const menuTemplateApplyResponseSchema = successResponseSchema(
  menuTemplateApplyResultSchema,
);

export type ComboResponse = Static<typeof comboResponseSchemaModel>;
export type PriceRuleResponse = Static<typeof priceRuleResponseModelSchema>;
export type PromotionResponse = Static<typeof promotionResponseModelSchema>;
export type MenuTemplateResponse = Static<
  typeof menuTemplateResponseModelSchema
>;
export type MenuTemplateApplyResponse = Static<
  typeof menuTemplateApplyResultSchema
>;
export type ComboPreviewResponse = Static<typeof comboPreviewSchema>;
export type PromotionPreviewResponse = Static<typeof promotionPreviewSchema>;
