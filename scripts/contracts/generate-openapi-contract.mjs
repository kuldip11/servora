import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const skipExport = args.includes("--skip-export");
const explicitInput = args.find((arg) => !arg.startsWith("--"));
const input = resolve(explicitInput ?? ".cache/openapi.json");
const output = resolve("packages/api-client/src/generated/openapi-contract.ts");

if (!skipExport && !explicitInput) {
  const result = spawnSync(
    "bun",
    ["run", "--cwd", "apps/api", "openapi:export"],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const spec = JSON.parse(await readFile(input, "utf8"));
const methods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);
const operations = [];

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
};

const schemaRegistry = new Map();
const schemaName = (schema) => {
  if (!schema) return "never";
  const canonical = JSON.stringify(canonicalize(schema));
  const hash = createHash("sha256")
    .update(canonical)
    .digest("hex")
    .slice(0, 12);
  const name = `Schema_${hash}`;
  if (!schemaRegistry.has(name)) schemaRegistry.set(name, schema);
  return name;
};

const quoteKey = (key) =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);

const schemaToTs = (schema, seen = new Set()) => {
  if (!schema || typeof schema !== "object") return "unknown";
  if (schema.$ref) return "unknown";
  if (Object.prototype.hasOwnProperty.call(schema, "const"))
    return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum))
    return (
      schema.enum.map((value) => JSON.stringify(value)).join(" | ") || "never"
    );
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.map((entry) => schemaToTs(entry, seen)).join(" | ");
  if (Array.isArray(schema.oneOf))
    return schema.oneOf.map((entry) => schemaToTs(entry, seen)).join(" | ");
  if (Array.isArray(schema.allOf))
    return schema.allOf
      .map((entry) => `(${schemaToTs(entry, seen)})`)
      .join(" & ");

  const nullable = schema.nullable === true ? " | null" : "";
  const rawType = schema.type;
  if (Array.isArray(rawType)) {
    const variants = rawType.map((type) =>
      type === "null"
        ? "null"
        : schemaToTs({ ...schema, type, nullable: false }, seen),
    );
    return [...new Set(variants)].join(" | ");
  }
  if (rawType === "string") return `string${nullable}`;
  if (rawType === "number" || rawType === "integer") return `number${nullable}`;
  if (rawType === "boolean") return `boolean${nullable}`;
  if (rawType === "null") return "null";
  if (rawType === "array")
    return `Array<${schemaToTs(schema.items ?? {}, seen)}>${nullable}`;
  if (
    rawType === "object" ||
    schema.properties ||
    schema.additionalProperties ||
    schema.patternProperties
  ) {
    const required = new Set(schema.required ?? []);
    const members = Object.entries(schema.properties ?? {}).map(
      ([key, value]) =>
        `  ${quoteKey(key)}${required.has(key) ? "" : "?"}: ${schemaToTs(value, seen)};`,
    );
    const additionalSchema =
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
        ? schema.additionalProperties
        : Object.values(schema.patternProperties ?? {})[0];
    if (additionalSchema && members.length === 0) {
      return `Record<string, ${schemaToTs(additionalSchema, seen)}>${nullable}`;
    }
    const objectType = members.length
      ? `{\n${members.join("\n")}\n}`
      : "Record<string, unknown>";
    return `${objectType}${nullable}`;
  }
  return `unknown${nullable}`;
};

const parameterSchema = (parameters, location) => {
  const selected = (parameters ?? []).filter(
    (parameter) => parameter?.in === location,
  );
  if (!selected.length) return null;
  return {
    type: "object",
    additionalProperties: false,
    required: selected
      .filter((parameter) => parameter.required)
      .map((parameter) => parameter.name),
    properties: Object.fromEntries(
      selected.map((parameter) => [parameter.name, parameter.schema ?? {}]),
    ),
  };
};

const responseSchema = (response) => {
  const content = response?.content ?? {};
  return (
    content["application/json"]?.schema ??
    content["text/plain"]?.schema ??
    Object.values(content)[0]?.schema ??
    null
  );
};

for (const [path, definition] of Object.entries(spec.paths ?? {})) {
  for (const [method, operation] of Object.entries(definition ?? {})) {
    if (!methods.has(method)) continue;
    const operationId = operation.operationId;
    if (!operationId)
      throw new Error(`${method.toUpperCase()} ${path} is missing operationId`);

    const pathParamsSchema = parameterSchema(operation.parameters, "path");
    const querySchema = parameterSchema(operation.parameters, "query");
    const bodySchema =
      operation.requestBody?.content?.["application/json"]?.schema ?? null;
    const responses = Object.entries(operation.responses ?? {}).map(
      ([status, response]) => ({
        status,
        schema: responseSchema(response),
      }),
    );
    const successResponses = responses.filter(({ status }) =>
      /^2\d\d$/.test(status),
    );
    if (!successResponses.length)
      throw new Error(
        `${method.toUpperCase()} ${path} has no documented 2xx response`,
      );

    operations.push({
      operationId,
      method: method.toUpperCase(),
      path,
      pathParams: schemaName(pathParamsSchema),
      pathParamsRequired: Boolean(pathParamsSchema),
      query: schemaName(querySchema),
      queryRequired: Boolean(querySchema?.required?.length),
      body: schemaName(bodySchema),
      bodyRequired: Boolean(operation.requestBody?.required),
      success: successResponses.map(({ schema }) =>
        schema ? schemaName(schema) : "undefined",
      ),
    });
  }
}
operations.sort((a, b) => a.operationId.localeCompare(b.operationId));

const schemaLines = [...schemaRegistry.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, schema]) => `export type ${name} = ${schemaToTs(schema)};`);

const operationTypeLines = operations.map(
  (operation) => `  ${JSON.stringify(operation.operationId)}: {
    pathParams: ${operation.pathParams};
    pathParamsRequired: ${operation.pathParamsRequired};
    query: ${operation.query};
    queryRequired: ${operation.queryRequired};
    body: ${operation.body};
    bodyRequired: ${operation.bodyRequired};
    response: ${[...new Set(operation.success)].join(" | ")};
  };`,
);

const operationRegistryLines = operations.map(
  (operation) =>
    `  ${JSON.stringify(operation.operationId)}: { method: ${JSON.stringify(operation.method)}, path: ${JSON.stringify(operation.path)} },`,
);

const generated = `// AUTO-GENERATED by scripts/contracts/generate-openapi-contract.mjs.
// Do not hand-edit. Run \`bun run contracts:generate\`.

import type { AxiosInstance, AxiosRequestConfig } from "axios";

export const OPENAPI_VERSION = ${JSON.stringify(spec.info?.version ?? "unknown")} as const;

export const OPENAPI_OPERATIONS = {
${operationRegistryLines.join("\n")}
} as const;

${schemaLines.join("\n\n")}

export interface OpenApiOperationTypes {
${operationTypeLines.join("\n")}
}

export type OpenApiOperationId = keyof OpenApiOperationTypes;
export type OpenApiMethod = (typeof OPENAPI_OPERATIONS)[OpenApiOperationId]["method"];
export type OpenApiPath = (typeof OPENAPI_OPERATIONS)[OpenApiOperationId]["path"];

type RequiredField<Name extends string, Value, Required extends boolean> =
  [Value] extends [never]
    ? {}
    : Required extends true
      ? { [Key in Name]: Value }
      : { [Key in Name]?: Value };

export type OpenApiRequestInput<Operation extends OpenApiOperationId> =
  RequiredField<"pathParams", OpenApiOperationTypes[Operation]["pathParams"], OpenApiOperationTypes[Operation]["pathParamsRequired"]> &
  RequiredField<"query", OpenApiOperationTypes[Operation]["query"], OpenApiOperationTypes[Operation]["queryRequired"]> &
  RequiredField<"body", OpenApiOperationTypes[Operation]["body"], OpenApiOperationTypes[Operation]["bodyRequired"]> & {
    headers?: AxiosRequestConfig["headers"];
  };

export type OpenApiSuccessResponse<Operation extends OpenApiOperationId> =
  OpenApiOperationTypes[Operation]["response"];

const interpolatePath = (path: string, params?: Record<string, unknown>): string =>
  path.replace(/\\{([^}]+)\\}/g, (_, key: string) => {
    const value = params?.[key];
    if (value === undefined || value === null) throw new Error(\`Missing OpenAPI path parameter: \${key}\`);
    return encodeURIComponent(String(value));
  });

export const createGeneratedOpenApiClient = (client: AxiosInstance) => ({
  async request<Operation extends OpenApiOperationId>(
    operation: Operation,
    input: OpenApiRequestInput<Operation>,
  ): Promise<OpenApiSuccessResponse<Operation>> {
    const definition = OPENAPI_OPERATIONS[operation];
    const requestInput = input as {
      pathParams?: Record<string, unknown>;
      query?: unknown;
      body?: unknown;
      headers?: AxiosRequestConfig["headers"];
    };
    const response = await client.request({
      method: definition.method,
      url: interpolatePath(definition.path, requestInput.pathParams),
      ...(requestInput.query === undefined ? {} : { params: requestInput.query }),
      ...(requestInput.body === undefined ? {} : { data: requestInput.body }),
      ...(requestInput.headers === undefined ? {} : { headers: requestInput.headers }),
    });
    return response.data as OpenApiSuccessResponse<Operation>;
  },
});
`;

await mkdir(resolve("packages/api-client/src/generated"), { recursive: true });
if (checkOnly) {
  let current = "";
  try {
    current = await readFile(output, "utf8");
  } catch {}
  if (current !== generated) {
    console.error(
      "Generated OpenAPI client is stale. Run `bun run contracts:generate` and commit the result.",
    );
    process.exit(1);
  }
  console.log(
    `Generated OpenAPI client is current (${operations.length} operations, ${schemaRegistry.size} schemas).`,
  );
} else {
  await writeFile(output, generated);
  console.log(
    `Generated ${operations.length} operations / ${schemaRegistry.size} schemas -> ${output}`,
  );
}
