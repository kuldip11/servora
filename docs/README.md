# Servora Documentation Index

## Maintained architecture and implementation documents

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system architecture, tenancy, realtime, reliability, and data-flow boundaries.
- [`FRONTEND_ENGINEERING.md`](./FRONTEND_ENGINEERING.md) — frontend engineering, performance, accessibility, authorization, observability, and UI standards.
- [`API_ERROR_CONTRACT.md`](./API_ERROR_CONTRACT.md) — standardized frontend-friendly API error contract and failure-path rules.
- [`API_CONTRACT_HARDENING_PLAN.md`](./API_CONTRACT_HARDENING_PLAN.md) — detailed production-hardening plan for request schemas, response DTOs, runtime validation, OpenAPI, generated clients, webhooks, and realtime contracts.
- [`API_CONTRACT_HARDENING_STATUS.md`](./API_CONTRACT_HARDENING_STATUS.md) — master status tracker and phase gates for the contract-hardening initiative.
- [`API_CONTRACT_MODULE_MATRIX.md`](./API_CONTRACT_MODULE_MATRIX.md) — route-file-by-route-file migration checklist for all current HTTP contract surfaces.
- [`JOB_IMPACT_IMPLEMENTATION_STATUS.md`](./JOB_IMPACT_IMPLEMENTATION_STATUS.md) — status of the senior-frontend/job-impact improvement work.

## Agent workflow

When an AI agent continues API contract work, it should read these files in order:

1. `API_ERROR_CONTRACT.md`
2. `API_CONTRACT_HARDENING_PLAN.md`
3. `API_CONTRACT_HARDENING_STATUS.md`
4. `API_CONTRACT_MODULE_MATRIX.md`
5. the relevant API module source/tests

After completing a task, the agent must update the status tracker and module matrix before finishing.
