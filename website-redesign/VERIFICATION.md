# Verification and scope

## Implemented scope

All 21 public marketing, product, utility and legal pages have the new shell and presentation. The existing `/login` redirect, lead endpoint, app-origin configuration and SEO machinery are preserved. Eleven capability pages cover four operational workspaces and the management tasks behind them. `/demo` is a dedicated local example with shared guest, kitchen, floor and POS state; it creates no real orders or payments.

The order flow supports item customization and quantities, cart totals and an illustrative discount/tax, placing/resetting an order, kitchen progress, ready-food attention and guest requests. Management sections and branch context have explicit sample states. Failure and success feedback in enquiry forms are tested without sending real enquiries.

## Skills applied

| Skill                       | Application                                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Taste frontend design       | Research-led independent direction; seeded palette/type/composition; one licensed type redraw; static lint; actual render review and refinement. Source UI takes priority in product captures.                                            |
| Vercel React best practices | Server-rendered marketing/content/metadata; small client islands; lazy playground; optimized images and self-hosted font; production bundle/build review.                                                                                 |
| Vercel composition patterns | Small layout/action/brand/product primitives and task-specific page compositions rather than a page component with many flags.                                                                                                            |
| TanStack Query guidance     | Assessed applicability: the marketing site has no server-state cache or QueryClient. The local sample uses React state and the existing form uses its existing POST contract. No unnecessary Query provider or operational cache changes. |
| SEO audit                   | Evidence-backed copy, category/workflow intent, crawlable internal links, legal/login indexation boundaries and sitemap parity.                                                                                                           |
| React SEO skills            | Next.js metadata, canonicals, Open Graph/Twitter, JSON-LD and route registration, verified on built HTML.                                                                                                                                 |
| Vercel React reviewer       | Component/hooks/accessibility/performance/TypeScript checklist after editing TSX.                                                                                                                                                         |
| Image generation            | One original hospitality scene, clearly labeled as an AI-generated illustration; never presented as a customer or product screenshot.                                                                                                     |
| Vercel deployment guidance  | Read-only verification of the preview's project, branch, source commit and READY state. No production promotion.                                                                                                                          |

## Automated evidence

Production review uses Node 22 and the repository's frozen Bun lockfile in GitHub Actions. Final code commit `606d62c601836db4d0a8a789e2cb6be41895db59` passed [production review run 41290978491](https://github.com/kuldip11/servora/actions/runs/41290978491):

- Lint and production compilation/type validation.
- 30 unit tests across 10 files, including the existing lead API and legacy demo coverage plus sample bill calculation.
- 19 Chromium browser tests, including serious/critical axe checks, route/app navigation, consent-aware analytics, keyboard tour/viewer, mobile navigation, order handoff and enquiry failure/retry/success.
- Built SEO audit: 18 indexable pages, sitemap parity, social metadata, one main/H1 per page and JSON-LD.
- 105 responsive page checks: all 21 public pages at 320, 390, 768, 1440 and 1920 pixels. No horizontal overflow, broken images, non-200 route or duplicate main/H1.

The final run includes the small-screen hero boundary correction. Screenshots are actual production output, not design mockups. Unit tests intentionally exercise invalid JSON and delivery failures, so expected error logs are not deployment failures.

Source policy and asset validation also pass. Taste static lint reports zero failures and zero warnings. Taste's separate CDP inspector was attempted locally and in CI but Chrome exited before rendering; its automated render inspection is **not claimed passed**. Actual Playwright Chromium captures, geometry checks, axe and manual visual review provide the render evidence. This limitation is retained in the artifacts as `taste-exit.json`.

## Protected scope and remaining business inputs

The original worktree's status, staged patch and unstaged patch were compared against the fresh backup and remain unchanged. There is no behavioral diff in the management, kitchen, waiter, customer or API applications, or shared UI/API-client packages. No reset, clean, force push or merge was used.

Production legal policies, commercial terms, customer endorsements and live payment/configuration readiness require business evidence. They have not been invented. The lead backend is preserved and tested; the browser failure/retry test intercepts `/api/lead`, so it does not establish live webhook delivery. Production release and approved legal copy remain separate launch work. The redesign is available on a draft review branch and preview.

## Saved review evidence

[All browser captures and reports](https://github.com/kuldip11/servora/actions/runs/41290978491/artifacts/13076947832) are retained as a CI artifact. Representative final renders and the 105-case result JSON are persisted in [review-screenshots](review-screenshots/). Competitor reference captures and their HTTP provenance are persisted under [research/screenshots](research/screenshots/).
