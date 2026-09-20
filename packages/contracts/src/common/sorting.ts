import { Type, type Static } from "@sinclair/typebox";

export const sortDirectionSchema = Type.Union([
  Type.Literal("asc"),
  Type.Literal("desc"),
]);
export const searchTermSchema = Type.String({ minLength: 1, maxLength: 200 });

export type SortDirection = Static<typeof sortDirectionSchema>;
