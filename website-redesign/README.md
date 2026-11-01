# Servora website rebuild

The website positions Servora around a shared restaurant service workflow: take an order, prepare it, act on the floor and manage the operation. Product claims are grounded in operational source code. The visual identity, sitemap, copy and page layouts were developed after market and product research.

## Review the work

- [READY website preview](https://servora-iwc8fy7jq-kuldip11s-projects.vercel.app).
- [Draft PR #34](https://github.com/kuldip11/servora/pull/34), targeting `cleanup` from `codex/servora-market-rebuild`.
- [Competitor research and screenshots](research/COMPETITOR-RESEARCH.md).
- [Product analysis and source evidence](research/SERVORA-PRODUCT-ANALYSIS.md).
- [Positioning, messaging and conversion strategy](research/SERVORA-MARKETING-STRATEGY.md).
- [Design system](DESIGN-SYSTEM.md).
- [Page architecture](NEW-WEBSITE-ARCHITECTURE.md).
- [Protection and recovery](RECOVERY.md).
- [Verification, skills and release boundaries](VERIFICATION.md).
- [Final visual review](FINAL-REVIEW.md).

Implementation lives in `apps/website`. Operational application behavior is unchanged. A shared SEO registry addition registers `/demo`; the new waiter page uses the existing product-route registration mechanism.

The website includes real-component product views with labeled sample fixtures, a keyboard-accessible tour and full-size image viewer, a shared-state local playground, enquiry forms, configured app access and new social/icon assets. Commercial enquiry replaces invented pricing plans. Legal placeholders remain noindex until approved policies are available.

The source captures are reproducible from `product-capture/`; responsive production renders and competitor references are reproducible from `browser-review/` and the dedicated GitHub Actions workflows. Competitor imagery is research material and is not shipped as website content.
