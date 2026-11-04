# Servora Concierge: read-only pilot

## Implemented scope

The customer QR menu now has a session-scoped Concierge entry, shown only when the API enables the branch. Diners can ask complete questions in English, Hindi or Hinglish, receive up to four live item cards, and open the existing customization flow. A fresh menu read checks that the selected item is still available. Cart mutation, order creation, payment and bill requests remain in their existing flows. The assistant never performs these operations.

This is the first read-only pilot, not the complete multi-phase roadmap. Each question is independent; conversation history is deliberately not sent to the model or persisted.

## Data and trust boundary

1. Authenticate through `customerSessionService.getSession`. Tenant, branch, table and fulfillment mode come exclusively from that session.
2. Require global enablement, a configured gateway key/model, and an exact branch allowlist match.
3. Atomically reserve a turn in Redis before any model call. Fail closed if the limiter is unavailable.
4. Short-circuit recognized dietary/allergen questions to fixed, localized staff-handoff copy. No provider call is needed for these cases.
5. Make one bounded AI SDK tool-calling request. The model may supply validated search preferences only. It cannot supply item IDs, prices, restaurant IDs, public prose or mutations. Common email, phone and URL patterns are removed from user text before the request. This is minimization, not a guarantee that all personal data can be detected: names, addresses and unusual personal details may still appear in free text. Review provider processing terms before enabling a real pilot.
6. After successful model completion with validated preferences, call the existing customer menu service. It revalidates the session and resolves menu schedules, branch/channel visibility, effective availability and effective base prices. The tool callback captures preferences only; database access happens outside the SDK lifecycle.
7. Apply food type, known mild spice level, lexical dish/tag matching and optional per-item base-price ceiling in deterministic code. Display only these server results. A budget excludes open/weight prices, variants and modifier-bearing items rather than guessing the final configuration price. Tax and charges are explicitly excluded from the stated base price.
8. Render controlled localized text and server-owned cards; model prose is discarded. The provider receives no catalog, prices, recipes, internal IDs, costs or tool result data beyond a processing acknowledgement.

No allergen-free, Jain, vegan, halal or health suitability claims are generated. Existing empty allergen links and ingredient lists are insufficient to prove suitability. Ingredient/dietary questions hand off to staff. A visible disclaimer accompanies every result. The safety keyword guard is defense in depth, not a complete natural-language classifier; model classification provides another handoff path, and no result is presented as a safety guarantee.

The waiter button is an explicit diner action and uses the existing request service. It is shown only for dine-in sessions. A model tool never calls that mutation. Existing request-service behavior, including its current deduplication limitations, is unchanged.

## API contract

| Method | Path                                   | Result                                                                                      |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/api/customer/assistant/capabilities` | `{ success: true, data: { enabled } }`                                                      |
| POST   | `/api/customer/assistant/messages`     | `{ success: true, data: { language, outcome, message, items, disclaimer, canCallWaiter } }` |

Both require `X-Customer-Session` and set `Cache-Control: no-store`. Message bodies accept only `message` (1–600 characters) and `language` (`en`, `hi`, `hinglish`). The transport normalizes away unknown body fields; scope is always derived from authentication. Runtime request/response contracts live in `@pos/contracts`; generated API-client operations include both endpoints.

The pilot uses a bounded JSON response, not token streaming. Its useful output is the validated card result after search. SSE, multi-turn server context and richer retrieval remain follow-up work.

## Local enablement

Install the updated dependencies with `bun install`. Use the existing API environment configuration:

```dotenv
ASSISTANT_ENABLED=true
ASSISTANT_BRANCH_IDS=<exact branch UUID, comma-separated for multiple branches>
ASSISTANT_MODEL=<tool-capable gateway model ID chosen through evaluation>
AI_GATEWAY_API_KEY=<configure locally; never commit>
ASSISTANT_DAILY_TURN_LIMIT=200
```

Restart the API after changing settings. With no configuration, the rest of the application continues normally and the Concierge entry stays hidden. No database migration is required for this pilot. Do not enable a production branch before real-model evaluation and privacy review.

AI SDK is pinned to `7.0.159`; the API already runs on Bun. The SDK declares Node >=22 for Node consumers, so Node-based tooling importing it must meet that requirement. Model selection is explicit configuration; no unverified model ID is hardcoded.

## Abuse controls, usage and retention

- Existing global IP limiter remains in effect.
- Redis Lua atomically caps assistant use at 6 turns/session/minute, 30 turns/session lifetime, and a configurable 200 turns/tenant/UTC day by default. Lifetime keys expire with the authenticated session; day keys expire automatically. Rejected, failed and dietary-handoff attempts consume their reserved turn.
- One provider generation, no retries, maximum 400 output tokens, an 8-second SDK timeout, and a 600-character question limit. A turn may invoke the menu lookup at most once.
- Aggregate tenant/day model-call and input/output-token counters expire after 31 days. No prompts, replies, session tokens or conversation transcripts are stored by this module. Existing metrics record tokens, duration and failures without user text.
- Turn caps bound call volume; these counters are not a monetary budget or a billing ledger. Provider failures may incur usage that is not available to the application. Reconcile provider charges before commercial billing.
- Client chat history is session-scoped and held in memory by the Concierge entry. Completed turns survive closing and reopening the sheet while the same entry stays mounted; history is cleared explicitly, on QR-token change, entry unmount or page refresh. No browser persistence is used. Model requests are not retried automatically; closing the sheet aborts its active request.

## Verification and remaining work

Automated coverage includes the actual current demo catalog, English/Hindi/Hinglish safety phrases, injection attempts, unavailable-item results, budget exclusions, runtime HTTP contracts, expired sessions, branch scope, fail-closed limits, the actual SDK tool protocol through its mock language model, and customer interactions. These deterministic tests do not establish a real model's interpretation quality.

Before enabling a customer pilot:

- Configure a provider/model and run a restaurant-reviewed real-model golden set, especially Hindi/Hinglish, implicit allergies, negation and injection. Require no unsafe safety claims and full card/price grounding on that set; do not treat a passing set as a real-world guarantee.
- Complete a browser walkthrough on mobile and desktop with real QR sessions and restaurant data, including lost connectivity, provider timeout, expiry and item changes.
- Decide operational quotas, provider processing/retention terms, model cost targets and a pilot comparison group. Measure useful-card latency, completion and staff interruptions.

Later phases:

- Owner-reviewed dietary completeness, cross-contact declarations, variants/modifier/sub-recipe coverage and verification provenance.
- Owner-managed FAQs and customer-facing ingredient descriptions, with review/publish controls.
- Optional semantic retrieval/pgvector after comparing it with the structured/lexical baseline; durable indexing/outbox, retries, deletion handling and reconciliation.
- Streaming, server-owned multi-turn context, feedback, demand analytics and a settings UI.
- Confirmed cart tools, idempotent waiter/bill actions, order status, waiter app and voice/channels.

## Historical implementation checks (before this refactor)

- Full API test run: successful JSON report, no failed tests.
- Full customer-app suite: 123 tests passed.
- Generated API-client suite: 39 tests passed.
- API, customer-app, contracts and API-client TypeScript checks: passed.
- Targeted lint, formatting and whitespace checks: passed.
- OpenAPI export and generated-client consistency: 231 operations / 270 schemas, passed. The export was bundled for Node because native Bun execution is unavailable in this environment.
- Customer production bundle: passed; the Concierge sheet is a separate lazy-loaded chunk. Vite still reports its general main-bundle size advisory.
- Dependency versions, transitive closure, compatible Zod peer and registry integrity hashes: checked. Native `bun install --frozen-lockfile` could not be exercised here: the Bun installer exits with `NotDir`. Run the normal install/CI checks in the target development environment before a release.
- Browser visual verification: blocked before page launch by Chromium exiting with `SIGTRAP` in this environment; no successful browser review is claimed.
- Live provider/Hindi-Hinglish quality evaluation and a real QR-session end-to-end walkthrough: still required. SDK protocol tests use the SDK's mock model. The dedicated native Redis integration checks pass against an isolated Redis 7 instance.

All implementation changes are local to the `develop` worktree and intentionally uncommitted and unpushed.

## Repeatable pilot checks

Run the native Redis checks only against an explicitly selected disposable instance:

```bash
ASSISTANT_TEST_REDIS_URL=redis://127.0.0.1:6379/15 bun run test:assistant:redis
```

There is no fallback to `REDIS_URL`. The suite uses random tenant/session namespaces and deletes only its own keys; it never flushes a database. Five integration checks establish atomic concurrent limits, session isolation, lifetime limits across minute buckets, no partial reservation when the tenant budget rejects a call, and the 31-day aggregate usage TTL. CI runs this command against its own Redis service. The quality job explicitly selects Node 24 to meet the SDK's Node runtime requirement.

The live model evaluation is a separate opt-in command:

```bash
# Configure AI_GATEWAY_API_KEY and ASSISTANT_MODEL in apps/api/.env first.
ASSISTANT_EVAL_LIVE=true bun run assistant:eval
```

Without explicit opt-in and both model settings it exits before making any model call. The set contains 18 fixed English/Hindi/Hinglish cases, including implicit allergies, ingredient exclusions, a whole-order budget, staff requests, translated dish search and injection. It runs sequentially, with one bounded classification call per case, so it can incur up to 18 provider calls. It does not access the application database or Redis or perform mutations. It builds a local fixture catalog from the current small seed and records only case IDs, failures, tokens and latency in `apps/api/.cache/assistant-evaluation.json`. A failed case produces a nonzero exit status.

The evaluation intentionally tests the classifier even for phrases that the production keyword guard would intercept. Its harness has deterministic tests, but no live provider evaluation has been claimed. A classifier evaluation complements the HTTP/auth/data/browser tests; it is not a replacement for them.

Staff requests now receive localized service guidance, rather than the dietary-verification message. Dietary questions continue to receive the fixed safety handoff.

## Concierge structure and failure diagnosis

The assistant feature stays under `apps/api/src/modules/assistant`. Files are separated by behavior:

| File                                  | Responsibility                                                 |
| ------------------------------------- | -------------------------------------------------------------- |
| `assistant.route.ts`                  | HTTP contracts, session header, cache headers and cancellation |
| `assistant.controller.ts`             | Call application services and wrap success responses           |
| `assistant.service.ts`                | Session, enablement, turn reservation and orchestration        |
| `assistant.input.ts`                  | Strict model preference schema and type                        |
| `assistant.model.ts`                  | Bounded AI Gateway tool call                                   |
| `assistant.safety.ts`                 | Local dietary handoff guard and text redaction                 |
| `assistant-recommendation.service.ts` | Resolve intent; fetch live menu for menu intent                |
| `assistant.search.ts`                 | Deterministic filtering, ranking and card projection           |
| `assistant.responses.ts`              | Controlled localized response copy                             |
| `assistant.diagnostics.ts`            | Privacy-preserving failure logs and stage metrics              |
| `assistant.errors.ts`                 | Controlled protocol failure reasons                            |
| `assistant.limits.ts`                 | Atomic fail-closed Redis turn caps                             |
| `assistant.usage.ts`                  | Best-effort aggregate usage counters                           |
| `assistant.evaluation.ts`             | Opt-in model evaluation cases and harness                      |

The former `assistant.policy.ts` has been split into input, safety, search and response files. No public API contract changed. Tests in `test/` now import and mock their parent module paths correctly. The Redis integration runner now targets the actual test location.

Model execution only captures validated preferences. Menu lookup starts after successful model completion. A provider failure after a tool callback cannot trigger a database lookup or produce cards. Usage reporting already handles its own Redis errors; it is not a confirmed cause of the reported 503.

### Diagnose the reported 503 locally

Run the API with your existing local settings and submit a non-dietary request such as “Vegetarian, not spicy, under ₹300”. Inspect the structured API log event `assistant.request_failed`. It includes tenant/branch identifiers, a failure `stage`, and an HTTP `upstreamStatus` when a safe numeric status is available. It never includes the message, session token, raw exception, stack, provider response body or headers.

| Stage         | Check next                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `reservation` | Redis connectivity; the turn limiter remains fail-closed                                                      |
| `model`       | Gateway credentials, configured model/tool support, connectivity and timeouts; use upstream status if present |
| `protocol`    | Model integration returned without validated preferences                                                      |
| `menu`        | Existing customer-menu service, session revalidation and database dependencies                                |

`servora_assistant_failures_total` now has a bounded `stage` label. Monitoring that needs a single total should sum across stages. Authentication, disabled-branch errors and quota rejection retain their existing HTTP behavior.

No live server logs, database, QR session or provider credentials were supplied with the archive. The original 503 root cause therefore remains unverified. No pgvector extension, embedding pipeline or database migration is included in this foundation change. Semantic retrieval should be evaluated against this structured/lexical baseline before integration.

### Model completion checks

A valid classification requires exactly one tool call and one successful tool result. Duplicate calls, missing calls, invalid results and output truncated by the token limit are rejected before the live menu is read. Logs for these failures have `stage=protocol` and a controlled `reason`: `duplicate_tools`, `missing_tool`, `invalid_tool_result` or `truncated_output`. The numeric upstream HTTP status remains available for provider failures when supplied by the SDK. No raw model output is logged.

## Current archive verification

The foundation refactor was checked with a clean API TypeScript check and a successful focused test run: 66 passed, five Redis integration cases skipped. The added flow tests combine the real HTTP contracts, assistant orchestration, AI SDK tool protocol, safety guard, menu filtering and response projection. External provider/session/menu/Redis boundaries use fixtures; this does not establish live provider quality or database integration.

The test runner initially stalled because this sandbox lacks `/proc` RSS data required by Node's memory bookkeeping. A temporary host-only memory-metadata preload resolved that environment issue. It is not included in Servora source. See `CONCIERGE_REFACTOR_REVIEW.md` for remaining local verification and the exact application steps.

The module follows Servora’s existing route → controller → service convention. `assistant.controller.ts` wraps service results in HTTP success envelopes; `assistant.route.ts` owns request contracts, token extraction, cache headers and cancellation forwarding. `assistant-recommendation.service.ts` exposes `assistantRecommendationService.resolve`. Search and safety remain pure functions. No assistant repository is added because the feature reuses the existing menu service.

## Chat interface

The previous single-result panel was replaced by a session-scoped transcript. New questions append a user bubble and a pending assistant bubble, then replace only that pending bubble with the response or an error. Previous cards remain visible during subsequent searches. The composer lives in the BottomSheet footer; the transcript scrolls independently. Language changes do not delete earlier turns. Clear chat removes the visible history and does not reset server quotas.

Closing the sheet aborts active work. An interrupted question receives a controlled stopped-search message, and a late response cannot overwrite that turn. Changing QR tokens remounts the entry, preventing the next session from seeing the previous session's history. Opening any historical card still refreshes the current menu before customization.

This is display history, not server conversation memory. The API still receives only the current message and language. No new provider calls, server endpoints, database tables, streaming or cart actions were added. Prompts must still contain complete preferences.

Frontend responsibilities:

- `Concierge.tsx`: capability query, QR-token isolation and in-memory history ownership.
- `ConciergeSheet.tsx`: composer, request lifecycle, cancellation and fresh-menu item selection.
- `ConciergeTranscript.tsx`: accessible conversation log, user/assistant bubbles and historical cards.
- `concierge.copy.ts`: localized labels and controlled copy.
- `types.ts`: feature props and discriminated chat-turn types.

The customer-app suite passes 128 tests, including multi-turn display, pending/error preservation, close/reopen, explicit clearing, QR-token isolation and late canceled completions. TypeScript and targeted lint pass. Browser visual verification was unavailable because this environment has no installed Playwright browser executable.

### Visual layout

The Concierge sheet uses Servora’s customer theme, including when rendered through the dialog portal. The empty state offers four preference starters; an ongoing conversation uses smaller suggestion chips. Language and clear-history controls stay secondary to the transcript. The footer combines question input and an accessible send button, with a reminder to include complete preferences. Dish cards adapt from one column on mobile to two on wider screens, and all displayed prices and food types still come from the API response. No photos, ratings or availability claims are fabricated.
