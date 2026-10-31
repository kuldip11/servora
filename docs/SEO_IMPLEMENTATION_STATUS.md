# Servora SEO implementation status

Date: 2026-11-01

This implements the code changes from the SEO audit while preserving the existing architecture: framework-neutral `packages/seo`, a Next.js App Router metadata adapter for the website, and private Vite operational apps. Changes are local; no deployment, repository push, Search Console submission or external analytics-property change has been performed.

## Audit findings and disposition

| Audit item              | Implemented                                                                                                                                                                                                                                                                                                                                                                                | Remaining                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: Production identity | Website and all four app build commands enforce production URL validation. Website/app origins reject endpoint paths, credentials and placeholder domains. Sign-in and webhook URLs may have endpoint paths. Canonical helper rejects external/network paths, backslashes, queries and fragments. Turbo hashes/passes SEO environment inputs.                                              | Supply real website, four application, sign-in and lead endpoint URLs in deployment settings. No production domain was invented.                                                                                           |
| S2: Social images       | Page metadata explicitly supplies complete Open Graph and Twitter image defaults. Optional image-alt override is used. Generated HTML and local HTTP responses confirm the fix.                                                                                                                                                                                                            | Optional approved feature-specific social assets.                                                                                                                                                                          |
| S3: Crawl and noindex   | Operational app shells are crawlable so crawlers can observe existing noindex metadata/headers. API routes and token/session query URLs remain disallowed. Website login is no longer blocked in robots.txt. Authentication and authorization are unchanged.                                                                                                                               | Verify actual hosting headers and deployed QR/session URLs. robots.txt is not access control; session URLs must remain private/nonindexable.                                                                               |
| S4: Validation          | Source metadata checks tolerate multiline tags and attribute ordering. Actual build HTML is parsed with Python's standard HTMLParser. Website sitemap parity, metadata uniqueness, canonicals, social images, H1/main landmarks and JSON-LD parsing are required. Missing builds fail instead of silently skipping. CI invokes source/assets, configuration tests and built-output checks. | Remote CI has not run in this session.                                                                                                                                                                                     |
| S5: Product content     | Homepage title/H1 clearly identify restaurant management software. Feature H1s use their product intent mappings. All ten feature pages gain distinct workflow questions and demo evaluation guidance. Core content remains server-rendered.                                                                                                                                               | Validate keyword demand/geography with real market data; add approved real product screenshots and customer examples. No fabricated statistics or rankings.                                                                |
| S6: Buyer trust         | Pricing now explains single-location versus group requirements and what buyers should confirm in a quote.                                                                                                                                                                                                                                                                                  | Exact prices, commercial terms, business identity, legal policies, hardware compatibility and customer proof require approved business details. Existing legal placeholders remain noindex.                                |
| S7: Structured data     | Stable Organization, WebSite and SoftwareApplication identifiers. Feature pages describe WebPage entities referring to the same platform rather than inventing ten separately marketed apps. Shared safe JSON-LD serialization escapes HTML delimiters.                                                                                                                                    | Live schema validation. No invented free price, offer or review; SoftwareApplication rich-result eligibility is not claimed.                                                                                               |
| S8: Measurement         | Explicit pathname page views wait for tag initialization, deduplicate rerenders and respect consent changes. Standard GA4 page_path/page_location/page_title fields are emitted; query strings are omitted. GA opt-out flag is set when consent is withdrawn. Regression test covers readiness, navigation, deduplication and consent changes.                                             | In GA4, disable Enhanced Measurement history-based page views when using this manual approach; verify one page view per navigation in DebugView and configure approved key events. No GA property was accessed or changed. |
| S9: Maintenance         | Removed nested main landmark. Generated sitemap and HTML sets must agree. Existing module/SEO registries retained instead of introducing a new CMS.                                                                                                                                                                                                                                        | Meaningful editorial lastmod dates may be added when an actual content-date source exists. No build-time fake timestamps.                                                                                                  |

## Configuration and build checks

Normal production builds now fail when required origins are missing or placeholders remain. Replace the documentation placeholders in `.env.example`; do not use them for deployment.

CI uses reserved, non-routable `.invalid` fixture hosts and requires both `CI=true` and `SERVORA_SEO_TEST_BUILD=true`. This exception is rejected when `VERCEL_ENV=production` or `RENDER=true`. Never set the fixture flag in deployment configuration. Fixture hosts prove rendering/configuration behavior only; they are not a live deployment.

`python3` is required for the built-HTML checker. The existing Ubuntu CI runner supplies it; no application runtime dependency was added.

Commands from the repository root:

```sh
bun run verify:seo
node --test scripts/seo/production-env.test.mjs
bun run test:website
bun run build
bun run seo:audit
```

For a website-only build, `node scripts/seo/audit-built-pages.mjs --website-only` still requires the complete website build and sitemap. The default audit additionally requires all four operational app builds.

## Verification

- Next.js 15.5.24 production website build, including lint and type validation: passed using explicit CI fixture URLs.
- Four operational application production builds, each including TypeScript: passed using per-app fixture origins.
- Website suite: 28 tests passed, including analytics lifecycle regression.
- Shared SEO suite: 25 tests passed, including malicious JSON-LD and invalid-origin/path cases.
- Production configuration suite: 10 tests passed, including generic hosting, credentials, endpoint paths, placeholders and fixture isolation.
- Source SEO policy and social asset checks: passed.
- Built SEO audit: all 16 indexable pages contain social images; sitemap parity, unique metadata, canonical paths, H1/main landmarks and JSON-LD parsing pass. All four app outputs retain noindex and resolve origin placeholders.
- Local production HTTP probes: 22 requests across normal/social-crawler user agents; homepage, Pricing and POS feature pages return social images. Legal/noindex, login redirect, sitemap, robots and unknown-path behavior were inspected.
- Whitespace diff check: passed.

Browser execution, remote CI, deployed hosting, Search Console coverage, real-user Core Web Vitals, GA4 property configuration and Rich Results Test remain unverified. The local environment cannot execute its browser binary; the existing browser CI job remains the acceptance path. Vite still reports pre-existing private-app chunk-size warnings; this change makes no performance-score claim.

The original audit remains a historical record; this status file records its implementation disposition.

## Continuation: deployment verification prepared

A reusable `seo:live` command and a manual read-only GitHub Actions workflow now check a configured deployment's metadata, social assets, sitemap, robots policies, private app noindex headers, login destination and 404 behavior. Shared HTML parsing is used by build and HTTP checks. Website browser CI now builds the production website and tests `next start`, including an offline analytics navigation/consent test. An external Playwright base URL can be provided explicitly for an existing site.

Verification for this continuation: eight new checker regression tests passed; the live checker passed against the local production build (16 indexable pages, two user agents, 39 website responses plus social assets); website TypeScript checks passed and Playwright discovered 13 tests. A browser run was attempted but could not launch because Chromium is missing in this environment. Remote CI and real deployment checks remain unverified. No real public URL was found in the project's environment files; no production values were invented.

See [SEO_LAUNCH_RUNBOOK.md](SEO_LAUNCH_RUNBOOK.md) for exact variables, commands, CI behavior and the remaining business/account inputs.
