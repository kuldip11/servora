# Servora SEO launch verification

The application code is prepared. These steps distinguish build verification from a live deployment. No real domain, legal approval or analytics account configuration is assumed.

## Deployment inputs

Set the existing variables in the actual hosting project. Do not send webhook secrets in chat.

| Variable                       | Purpose                                                               |
| ------------------------------ | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`         | Canonical public marketing HTTPS origin                               |
| `NEXT_PUBLIC_WEB_APP_URL`      | Management app HTTPS origin                                           |
| `NEXT_PUBLIC_KITCHEN_APP_URL`  | Kitchen app HTTPS origin                                              |
| `NEXT_PUBLIC_WAITER_APP_URL`   | Waiter app HTTPS origin                                               |
| `NEXT_PUBLIC_CUSTOMER_APP_URL` | Guest ordering HTTPS origin                                           |
| `NEXT_PUBLIC_APP_SIGNIN_URL`   | Complete management sign-in URL                                       |
| `LEAD_WEBHOOK_URL`             | Real server-side CRM/lead endpoint                                    |
| `NEXT_PUBLIC_GA_ID`            | Optional approved GA4 measurement ID                                  |
| `VITE_PUBLIC_APP_URL`          | Set separately on each operational app to that app's own HTTPS origin |

Never deploy `SERVORA_SEO_TEST_BUILD=true` or `.invalid` CI fixture domains. Public metadata URLs are compiled during the build: changing an origin requires a rebuild and deployment.

## Build acceptance

From the repository root, with deployment/build variables configured:

```sh
bun run verify:seo
bun run test:seo:checks
bun run build
bun run seo:audit
bun run test:e2e:website:production
```

Install the matching Playwright Chromium build first (`bunx playwright install --with-deps chromium`). Production website browser testing uses `next start` and requires the website to have been built; development mode remains available with the existing `test:e2e:website` command. CI builds the website with an offline GA test ID before the production browser suite. The analytics browser test stubs the Google tag and blocks analytics collection, so it verifies application behavior without sending test traffic to a real property.

## Deployed HTTP acceptance

Set the following values to the real origins, then run `bun run seo:live`:

```text
SMOKE_WEBSITE_URL
SMOKE_WEB_URL
SMOKE_KITCHEN_URL
SMOKE_WAITER_URL
SMOKE_CUSTOMER_URL
NEXT_PUBLIC_APP_SIGNIN_URL
```

The command performs read-only GET requests. It does not log in, submit forms, modify GA4 or submit a sitemap. It fails on incorrect canonicals, missing social images, public noindex rules, missing/duplicate metadata, malformed JSON-LD, blocked shell crawling, incorrect sign-in redirects, missing private hosting noindex headers and soft 404s. Responses have size/time limits; sitemap URLs outside the configured website origin are never crawled. Social assets currently must use the website origin, consistent with Servora's implementation.

Use `bun run seo:live --website-only` explicitly to check only the website. This skips private app hosting and the configured sign-in destination comparison; it is not full launch acceptance.

The manual **Deployed SEO verification** workflow (`.github/workflows/seo-live.yml`) runs the full check from GitHub Actions once the six real URL inputs are provided. It has read-only repository permissions and performs no deployment or database migration. This workflow has been added locally; no remote run is claimed.

To test an already built CI fixture website locally without confusing its canonical identity with the test transport:

```sh
# Run the website using its existing start command in another terminal.
SMOKE_WEBSITE_URL=http://127.0.0.1:3001 bun run seo:live \
  --local --website-only --canonical-origin=https://servora.ci.invalid
```

`--local` permits only loopback transport. `--canonical-origin` is allowed only in this local mode. These flags do not certify a public deployment.

## Browser and analytics acceptance

To exercise existing read-only website browser checks against an existing staging or public site, set `WEBSITE_E2E_BASE_URL` to its URL and run the website Playwright suite. No local server is started in that mode. The analytics test requires an explicitly configured measurement ID; otherwise it is skipped.

In the real GA4 property, confirm the manual page-view strategy and disable history-based page views in Enhanced Measurement to prevent duplication. In DebugView, verify one page view on initial consent, one per client navigation, no page views after optional consent is withdrawn, and the intended demo/contact conversion events. Avoid query strings or customer/session identifiers in analytics. The offline tests do not prove that the real measurement ID, collection endpoint, CSP or GA4 property settings are correct.

## Search and content acceptance

Before public launch, replace the three legal placeholders with approved policies and confirm actual company details, commercial terms and customer-facing support information. Add only approved prices, screenshots, compatibility claims and customer evidence. Target geography and keyword demand need confirmation before adding location-specific landing pages.

After deployment, verify ownership in Search Console and submit the real `/sitemap.xml`. Inspect homepage, Pricing and representative product pages; check selected canonicals and indexing status. Validate structured data with Rich Results Test/Schema Markup Validator. No SoftwareApplication rich-result eligibility is promised without the required genuine offer/review data.

Measure mobile Core Web Vitals on the deployed site with PageSpeed Insights and Search Console when field data is available. Local build size or passing tests alone cannot establish a performance score or ranking outcome.

## Current evidence and limits

On 2026-11-01, the reusable HTTP checker passed against the existing local production build: 16 indexable pages checked with two user agents, 39 website responses plus social-image responses. Eight checker regression tests passed, including missing social images, incorrect login redirects, absent private hosting headers, robots blocking and off-origin sitemap URLs. Website TypeScript validation passed and Playwright discovered 13 tests.

A real browser run was attempted against the local production server; Playwright failed at launch because its Chromium executable is not installed in this runtime. This is not an application assertion failure or a browser acceptance pass. GitHub CI is configured to install Chromium, but no remote CI execution is claimed.

Pending external inputs: production URLs, approved legal/business content, actual GA4 and Search Console access or results. These are the remaining launch dependencies.
