import { Elysia } from "elysia";

const INTEGER_QUERY_KEYS = new Set(["page", "limit"]);
const INTEGER_QUERY_VALUE = /^-?\d+$/;

export const normalizeIntegerQueryValues = (
  query: Record<string, unknown>,
): void => {
  for (const key of INTEGER_QUERY_KEYS) {
    const value = query[key];
    if (typeof value !== "string" || !INTEGER_QUERY_VALUE.test(value)) continue;

    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) query[key] = parsed;
  }
};

/**
 * URL query parameters are strings on the wire. Normalize the small set of
 * numeric transport keys before TypeBox validation so route contracts can
 * remain strict `Type.Integer()` schemas and handlers receive actual numbers.
 */
export const queryNormalizationPlugin = () =>
  new Elysia({ name: "query-normalization" }).onTransform(
    { as: "global" },
    ({ query }) => {
      normalizeIntegerQueryValues(query as Record<string, unknown>);
    },
  );
