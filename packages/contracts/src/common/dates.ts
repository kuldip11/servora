import { Type, type Static } from "@sinclair/typebox";

export const isoDateSchema = Type.String({ format: "date" });
export const isoDateTimeSchema = Type.String({ format: "date-time" });

export type IsoDate = Static<typeof isoDateSchema>;
export type IsoDateTime = Static<typeof isoDateTimeSchema>;
