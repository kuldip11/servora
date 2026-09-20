# @pos/validation

`@pos/validation` contains frontend/form validation and UI normalization rules.

It is **not** the source of truth for HTTP transport contracts.

- Network request/response contracts: `@pos/contracts`
- Runtime API boundary enforcement: Elysia route schemas from `@pos/contracts`
- Generated API operation types/client: `@pos/api-client/src/generated/openapi-contract.ts`
- Form validation, form-specific refinements, UI coercion/normalization: `@pos/validation`

A form schema may intentionally be stricter or more ergonomic than the transport schema. API and API-client code must not import transport types from this package.
