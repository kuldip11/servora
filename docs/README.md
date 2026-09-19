# Servora Documentation Index

## Maintained architecture and implementation documents

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system architecture, tenancy, realtime, reliability, and data-flow boundaries.
- [`FRONTEND_ENGINEERING.md`](./FRONTEND_ENGINEERING.md) — frontend engineering, performance, accessibility, authorization, observability, and UI standards.
- [`API_ERROR_CONTRACT.md`](./API_ERROR_CONTRACT.md) — standardized frontend-friendly API error contract and failure-path rules.
- [`API_CONTRACT_HARDENING_PLAN.md`](./API_CONTRACT_HARDENING_PLAN.md) — detailed production-hardening plan for request schemas, response DTOs, runtime validation, OpenAPI, generated clients, webhooks, and realtime contracts.
- [`API_CONTRACT_HARDENING_STATUS.md`](./API_CONTRACT_HARDENING_STATUS.md) — master status tracker and phase gates for the contract-hardening initiative.
- [`API_CONTRACT_MODULE_MATRIX.md`](./API_CONTRACT_MODULE_MATRIX.md) — route-file-by-route-file migration checklist for all current HTTP contract surfaces.
- [`JOB_IMPACT_IMPLEMENTATION_STATUS.md`](./JOB_IMPACT_IMPLEMENTATION_STATUS.md) — status of the senior-frontend/job-impact improvement work.
- [`UI_ERROR_HANDLING_PLAN.md`](./UI_ERROR_HANDLING_PLAN.md) — repository-wide UI error handling, form validation, query/mutation failure UX, stale-data, accessibility, and recovery plan.
- [`UI_ERROR_HANDLING_STATUS.md`](./UI_ERROR_HANDLING_STATUS.md) — master status tracker, form matrix, critical query matrix, mutation checklist, and release gates for UI error handling.

## Agent workflow

When an AI agent continues API contract work, it should read these files in order:

1. `API_ERROR_CONTRACT.md`
2. `API_CONTRACT_HARDENING_PLAN.md`
3. `API_CONTRACT_HARDENING_STATUS.md`
4. `API_CONTRACT_MODULE_MATRIX.md`
5. the relevant API module source/tests

After completing a task, the agent must update the status tracker and module matrix before finishing.

For UI error-handling/form-validation work, read these files in order:

1. `API_ERROR_CONTRACT.md`
2. `FRONTEND_ENGINEERING.md`
3. `UI_ERROR_HANDLING_PLAN.md`
4. `UI_ERROR_HANDLING_STATUS.md`
5. the relevant app/module source and tests

For every UI remediation task, agents must also apply the clean-component architecture section in `UI_ERROR_HANDLING_PLAN.md` and satisfy the architecture acceptance checklist in `UI_ERROR_HANDLING_STATUS.md`. Error handling must not be implemented by moving raw API/error logic into page/form JSX.

After completing a UI error-handling task, update `UI_ERROR_HANDLING_STATUS.md` before finishing.

## UI error-handling implementation checkpoint

`UI_ERROR_HANDLING_STATUS.md` is the source of truth for implementation progress. The 2026-09-18 checkpoint records completed P0 safety work, false-empty query remediation, shared error primitives, and the forms already converted to the unified client-validation + inline backend-field-error contract. Items with implementation present but focused verification still pending remain `IN_PROGRESS`.
