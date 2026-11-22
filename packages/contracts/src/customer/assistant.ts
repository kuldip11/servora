import { Type, type Static } from "@sinclair/typebox";
import { successResponseSchema, uuidSchema } from "../common";

export const assistantLanguageSchema = Type.Literal("en");
const assistantMealTimeSchema = Type.Union([
  Type.Literal("BREAKFAST"),
  Type.Literal("LUNCH"),
  Type.Literal("DINNER"),
  Type.Literal("SNACKS"),
  Type.Literal("DRINKS"),
  Type.Literal("DESSERT"),
]);
// Filters of the previous answer, echoed back so follow-ups can refine them.
export const assistantStateSchema = Type.Object(
  {
    foodType: Type.Union([
      Type.Literal("ANY"),
      Type.Literal("VEG"),
      Type.Literal("NON_VEG"),
      Type.Literal("EGG"),
    ]),
    mild: Type.Boolean(),
    minPrice: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    maxPrice: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
    terms: Type.Array(Type.String({ maxLength: 40 }), { maxItems: 6 }),
    mealTime: Type.Union([assistantMealTimeSchema, Type.Null()]),
  },
  { additionalProperties: false },
);
export const assistantQuestionSchema = Type.Object(
  {
    message: Type.String({ minLength: 1, maxLength: 600 }),
    language: Type.Optional(assistantLanguageSchema),
    state: Type.Optional(assistantStateSchema),
  },
  { additionalProperties: false },
);
export const assistantCapabilitiesSchema = Type.Object(
  { enabled: Type.Boolean() },
  { additionalProperties: false },
);
export const assistantReplySchema = Type.Object(
  {
    message: Type.String(),
    language: assistantLanguageSchema,
    outcome: Type.Union([
      Type.Literal("MATCHES"),
      Type.Literal("NO_MATCH"),
      Type.Literal("ASK_STAFF"),
      Type.Literal("OUT_OF_SCOPE"),
      Type.Literal("UNAVAILABLE"),
      Type.Literal("NOT_ON_MENU"),
    ]),
    items: Type.Array(
      Type.Object(
        {
          id: uuidSchema,
          name: Type.String(),
          basePrice: Type.String(),
          foodType: Type.Union([
            Type.Literal("VEG"),
            Type.Literal("NON_VEG"),
            Type.Literal("EGG"),
          ]),
          spiceLevel: Type.Union([Type.String(), Type.Null()]),
          hasOptions: Type.Optional(Type.Boolean()),
        },
        { additionalProperties: false },
      ),
      { maxItems: 6 },
    ),
    disclaimer: Type.String(),
    canCallWaiter: Type.Boolean(),
    suggestions: Type.Optional(
      Type.Array(Type.String({ maxLength: 60 }), { maxItems: 6 }),
    ),
    state: Type.Optional(assistantStateSchema),
  },
  { additionalProperties: false },
);
export const assistantCapabilitiesResponseSchema = successResponseSchema(
  assistantCapabilitiesSchema,
);
export const assistantReplyResponseSchema =
  successResponseSchema(assistantReplySchema);
export type AssistantQuestion = Static<typeof assistantQuestionSchema>;
export type AssistantReply = Static<typeof assistantReplySchema>;
export type AssistantLanguage = Static<typeof assistantLanguageSchema>;
