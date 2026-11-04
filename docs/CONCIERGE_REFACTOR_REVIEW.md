# Concierge foundation refactor

## Result

The Concierge now separates request orchestration, strict input validation, safety checks, recommendation resolution, menu filtering, response text and diagnostics. It still uses the current customer-menu service and database-backed cards. No dummy recommendations, pgvector extension, embedding provider or database migration was added.

Menu retrieval happens after model classification succeeds, outside the AI SDK tool callback. The model cannot choose restaurant scope, item IDs or prices. Existing budget exclusions, dietary handoffs and quota controls remain in place.

Model completions now require exactly one tool call and one successful result. Missing/duplicate calls, invalid tool results and token-limit truncation have controlled diagnostic reasons and are rejected before the live menu is read. SDK tool-choice violations are mapped to those reasons without logging provider content.

The assistant test imports/mocks and the Redis integration runner had stale paths after tests moved into `test/`; those references have been repaired.

## Validation in this environment

- ESLint on the assistant module: passed.
- API TypeScript check: passed (`tsc --noEmit`).
- Formatting check on the assistant module, Redis runner and Concierge documentation: passed.
- Focused Vitest run: clean exit, 66 tests passed and five disposable-Redis integration tests skipped. This includes HTTP → real SDK tool protocol → menu filtering → response-contract tests, with external provider/session/menu/Redis boundaries replaced by test fixtures. This verifies application wiring, not real-model interpretation or a live database.
- Test-host limitation resolved: this sandbox has no `/proc` RSS data, so Node `process.memoryUsage()` throws `ENOENT` during the test runner's bookkeeping. A temporary host-only preload supplies unavailable RSS metadata so the runner can finish; application behavior and assertions are unchanged. The preload is excluded from this archive and is unnecessary in a normal development environment.
- Native Bun installation: failed with `NotDir`. Checks used a separate temporary npm dependency installation; project manifests and `bun.lock` were not changed. This does not certify the locked dependency installation.
- No live provider evaluation, database/Redis integration, QR-session walkthrough or browser verification was performed. No credentials or server logs were supplied.

## Apply and verify locally

This archive is a modified copy of the uploaded source; it has not changed the files on your computer. It includes `CONCIERGE_CHANGES.patch`, generated against the exact source you uploaded. Choose one patch for your current source: `CONCIERGE_CHANGES.patch` for the original uploaded source; `CONCIERGE_CHAT_UI.patch` for the controller/service archive before chat; `CONCIERGE_UI_POLISH.patch` for the basic chat-history archive. Each patch includes matching documentation updates. Apply only one patch. From your local Servora root, check and apply the appropriate patch using its extracted path:

```bash
git apply --check /path/to/CONCIERGE_CHANGES.patch
git apply /path/to/CONCIERGE_CHANGES.patch
```

The check does not change your files. If it fails because your local source changed after the upload, review the differences rather than forcing the patch. The patch includes the focused assistant changes, Redis test-runner path and documentation, and removes the old `assistant.policy.ts`. It also includes the customer-app chat transcript and related tests. It does not require a commit or GitHub push. The full updated source is also included for review.

From the project root:

```bash
bun install --frozen-lockfile
cd apps/api
bun run typecheck
bun run test src/modules/assistant/test
```

Use an explicitly disposable Redis instance for integration tests:

```bash
ASSISTANT_TEST_REDIS_URL=redis://127.0.0.1:6379/15 bun run test:assistant:redis
```

Restart the local API and repeat the failing non-dietary question with a valid QR session. Find `assistant.request_failed` in API logs. The `stage` identifies `reservation`, `model`, `protocol` or `menu`; an available `upstreamStatus` can help diagnose provider errors. Protocol failures also include a controlled `reason` (`missing_tool`, `duplicate_tools`, `invalid_tool_result` or `truncated_output`). Raw provider errors and customer messages are deliberately excluded. Share the stage, reason and status to continue diagnosing the 503; do not share your environment file or API key.

The existing `assistant:eval` command remains opt-in and can incur provider costs. Its results are needed before treating multilingual interpretation as verified.

See `SERVORA_CONCIERGE.md` for the file responsibility map and stage-by-stage troubleshooting. The live 503 root cause remains unverified. pgvector should follow a comparison against the working lexical/structured baseline.

The module follows Servora’s existing route → controller → service convention. `assistant.controller.ts` wraps service results in HTTP success envelopes; `assistant.route.ts` owns request contracts, token extraction, cache headers and cancellation forwarding. `assistant-recommendation.service.ts` exposes `assistantRecommendationService.resolve`. Search and safety remain pure functions. No assistant repository is added because the feature reuses the existing menu service.

## Customer chat UI update

The customer-facing request now displays user/assistant turns above a fixed composer instead of replacing one result panel. History stays in memory for the mounted QR session, survives sheet close/reopen, and clears on explicit Clear chat, token change, entry unmount or reload. Closing cancels active requests and marks an unfinished question as interrupted. Historical cards retain fresh-menu checks. Language changes preserve history.

This does not add AI conversation memory; every submitted question remains independent. No messages are stored in localStorage or sent as prior history. Clear chat affects display only, not Redis turn caps.

Checks: all 128 customer-app tests passed; customer TypeScript, assistant UI ESLint and formatting passed. The production Vite build passed with an explicit CI fixture origin; its existing main-bundle size advisory remains, and the Concierge is still lazy-loaded. Browser visual verification was blocked by a missing browser executable. Dependencies were installed only in temporary tooling; the source package manifests and lockfile were unchanged. The existing React 19/lucide-react peer-range mismatch required legacy peer resolution in that temporary tooling.

For local verification after applying the patch, run the customer-app typecheck, tests and build, then check the sheet on mobile with several questions, failures, close/reopen and item selection. The backend refactor checks above remain applicable; no backend logic changed in the chat UI update.

## Chat visual refinement

The interface now has a welcoming empty state, icon-led suggestions, a compact language selector and a single composer with an accessible arrow send control. The menu entry has a distinct icon treatment and directional affordance. Dish cards use a two-column layout on wider screens, clear price hierarchy, food-type icons and quieter option buttons. User bubbles use the theme foreground token for dark-mode contrast.

The sheet explicitly carries the `customer-experience` theme class so portaled content inherits the menu palette. It is width-constrained on larger screens and remains a bottom sheet on mobile. History, cancellation, quota enforcement, item refresh and independent-question behavior are unchanged.

Verification for the refinement: 128 customer-app tests passed; TypeScript, targeted ESLint and formatting passed. The production build passed using the existing CI fixture-origin path, with the existing main-chunk advisory. Visual browser verification could not run: the browser download returned a truncated archive. No source dependency, lockfile, backend, database or provider setting changed in this visual refinement.

## Source packaging and workspace repair

The uploaded archive contained 261 entries under nested `node_modules`, including regular directory copies of `@pos/contracts` below `packages/realtime` and `packages/api-client`, and a copied workspace dependency below validation. Earlier repackaging preserved those install artifacts. The customer's unresolved TypeBox errors name those copied-package paths. TypeBox itself is already a dependency of the actual contracts workspace and already present in `bun.lock`; no new TypeBox dependency or Vite externalization is appropriate.

The corrected archive contains no `node_modules` at any depth. `scripts/release/package-source.py` is now the source of distribution archives and excludes dependency trees, caches, build output, symlinks and `.env` secrets while retaining `.env.example`/`.env.template` if present. Run `bun run source:zip` to reproduce it.

Run `bun run setup` from an extracted project root, or run the standalone `setup-workspace.mjs` from an existing project root. The setup backs up only real-directory copies of known local workspace packages under installed dependency folders, performs normal `bun install`, then verifies workspace source resolution plus TypeBox and its value export. It does not force-update dependencies or use `--frozen-lockfile`. Copies are retained under `.cache/workspace-copies-*`; source, environment files and unrelated installed packages are not removed. A conventional dependency installation remains necessary for a source-only ZIP.

Checks: four Node repair/resolution tests and one Python archive test passed. A staging run detected and backed up all three copied workspace packages from the original archive. Native Bun installation remains blocked in this host with `NotDir`, so a complete native install is not certified. The actual repair and archive logic, including keeping symlinks and avoiding external dependency trees, is covered by the targeted tests.
