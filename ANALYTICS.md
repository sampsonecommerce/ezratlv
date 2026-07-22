# Ezra — Tracking & Analytics IDs (source of truth)

Last verified against the live code: 2026-07-13.
**Rule: what's in the website `<head>` is the truth. This file mirrors the code, not the Google UI.**

## What is actually installed on the site (verified in code)

| Tool | ID | Where in code | Notes |
|---|---|---|---|
| **GA4 (Analytics)** | `G-95JJX7T6CY` | all 6 live HTML files (loader + config) | THE live analytics property. Keep. |
| **Google Ads** | `AW-18310736783` | 4 main pages (config) + as a Google-tag destination | Conversion/remarketing tag. |
| **Meta Pixel** | `2174553826420246` | all pages (Pixel init) + server CAPI | |
| **Microsoft Clarity** | `xlpxnugq1w` | index, company-events, both wizard iframes | Heatmaps + session recordings. |
| GTM container | none | — | Not used. Tags are hard-coded gtag.js, not GTM. |

Live files carrying the tags: `index.html`, `company-events.html`, `english-index.html`,
`english-company-events.html`, `company-events-v2.html`, `english-company-events-v2.html`.
(Dead/never-served: `company-events-original.html`, `-merge.html`, `-demo.html` — ignore.)

## GA4 accounts/properties — KEEP vs RETIRE

There are two GA4 measurement IDs. Only one is a live, collecting stream.

**CORRECTED 2026-07-21 (live browser test):** the earlier table was BACKWARDS. `G-B8RHLY5VJK`
returns **404** from `googletagmanager.com/gtag/js?id=...` — it is a dead/deleted stream and has
never collected. `G-95JJX7T6CY` fires a real `page_view` to `analytics.google.com/g/collect`
and is the live one. The site loader carried the dead `G-B8` until 2026-07-21, so GA4 **and**
Google Ads both silently collected nothing (one loader feeds both). Swapped all 6 files to `G-95`.

| | KEEP ✅ | RETIRE ⛔ |
|---|---|---|
| Measurement ID | **G-95JJX7T6CY** (live, collects) | G-B8RHLY5VJK (dead, loader 404s) |
| Installed on site? | **Yes** (since 2026-07-21) | was on site until 2026-07-21 |
| Status | verified firing page_view | never worked |

Confirm in the GA4 UI which property/account owns `G-95JJX7T6CY` and treat that as home; if it
sits under the old "Google Ads חשבון" account, use Admin → Move property to relocate it under the
"Ezra" account (keeps all history, no re-tagging).

## Correct linking (the "one home" setup)

- **Google Ads → GA4:** link Ads to the **G-B8RHLY5VJK / "Ezra" (543484942)** property. Unlink G-95.
- **Clarity → GA4:** Clarity Settings → Integrations → Google Analytics → connect the **G-B8RHLY5VJK** property (correlates recordings with GA data). Clarity's own tag stays on-site regardless.
- **Google Ads tag on site:** `AW-18310736783` fires directly from the code — independent of the GA link.

## Cleanup checklist (safe order, reversible until the last step)

1. [ ] Relink Google Ads: remove the G-95 link, add the G-B8 ("Ezra" 543484942) link.
2. [ ] Remove **G-95JJX7T6CY** as a destination of the installed Google tag (stops the data mirroring).
3. [ ] Connect Clarity's GA integration to G-B8RHLY5VJK.
4. [ ] Re-import any Google Ads conversions that were built off G-95 (they're empty) from G-B8.
5. [ ] Confirm: G-B8 still shows Realtime data + Ads still counts conversions.
6. [ ] Only then: delete/archive the G-95 property and the spare Google-tag / GTM accounts.

Don't touch the website code for any of this — the site is already on the correct IDs.
