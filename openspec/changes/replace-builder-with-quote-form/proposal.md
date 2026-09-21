# Company events: a short quote form instead of the builder

## Why

Clarity analysis of 2026-09-21 (two months of sessions). The private events form, three short
steps, is the healthiest flow on the site. The company events builder asked for the most work
before contact details and almost nobody finished it. Company events traffic is now warm
outbound rather than paid mobile, and a buyer planning a company event wants a quote and a
person, not a menu configurator.

## A backup exists

The site as it stood before this change is kept on GitHub:

- branch `backup/2026-09-21-pre-clarity-changes`
- tag `backup-2026-09-21-pre-clarity-changes`

Both point at `main` as of 2026-09-13 (`6540921`), builder intact. `company-events-v2.html`
also stays in the tree, unlinked. To restore the builder:
`git checkout backup-2026-09-21-pre-clarity-changes -- company-events.html`.

## What Changes

- **Builder removed from the page.** The iframe overlay is gone. `.js-book` CTAs, `?package=`
  sitelinks, `?resume=` links and `#talk` open a one-screen quote form: name, phone, company,
  email (optional), package, guest range, date (optional), notes, optional marketing consent.
- **Lead shape unchanged server-side.** No `leadType`, so the worker files it under "Estimate
  Requested" with the package columns. Guest range travels in the notes; `guests` is the
  midpoint. No worker change.
- **Honest submit.** Awaited, success only on `ok`, retry plus a prefilled WhatsApp on failure.
- **One URL per funnel stage.** `/company-events/quote` and `/company-events/confirmation` via
  pushState. The builder logged itself twice (parent and iframe both carried Clarity).
- **Events.** Clarity `cq_open`, `cq_open_<plan>`, `cq_submit`, `cq_success`, `cq_fail`,
  `cq_invalid`, `cq_close_unsent`, `cq_whatsapp`. Meta `QuoteOpen` replaces `WizardStart`;
  `Lead`, GA4 `generate_lead` and the Ads conversion fire on success only.
- **"דברו איתנו" goes to WhatsApp.** Outbound clicks outnumbered builder starts three to one.
- **Hero** carries the price anchor, the guest range and what is included.
- **Homepage.** Benefit pills and the bar cards are links (they looked tappable and drew the
  most dead clicks). The cookie bar hides while a form is open, on both pages.

## Non-goals

- Prices, packages, menus. The worker. The private form. The custom 450+ modal.

## Impact

- `company-events.html`, `index.html`. English mirrors follow.
- Cloudflare redirect rules: add `/company-events/quote` next to `/wizard` and `/confirmation`.
