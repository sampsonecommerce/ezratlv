# Shared page skeleton — checklist for every new page

No build step, so this is verified per file, not shared code. Source of truth:
`index.html` head + chrome; tag IDs cross-checked against ANALYTICS.md.

## Head, in order
1. `<!DOCTYPE html><html lang="he" dir="rtl">`, charset, viewport
2. Meta Pixel `2174553826420246` (script + noscript img)
3. gtag.js loader `G-95JJX7T6CY`; config for `G-95JJX7T6CY` **and** `AW-18310736783`
4. Microsoft Clarity `xlpxnugq1w`, guarded by `ezra_cookie_ok !== "essential"`
5. `<title>` with the intent's exact Hebrew phrase; meta description; canonical
   `https://ezratlv.com/<slug>`; favicons; geo meta
6. Open Graph title/description/type
7. Fonts: preconnects + Heebo/Cormorant/Pliant/Inter stylesheet
8. Design tokens: `--bg #0f0d0b`, `--bg-soft`, `--cream #f0ebe0`, `--gold
   #c49a3c`, `--gold-light #f5d98a`
9. JSON-LD: `WebPage` + `Service` with `provider: {"@id":
   "https://ezratlv.com/#organization"}` — never a second LocalBusiness

Hero-height-freeze script NOT copied — content pages have no 100svh hero.
`hreflang` alternates NOT added — the new pages have no English twin (design
decision 2); canonical only.

## Body chrome
- Nav copied from `index.html`, section anchors replaced by page links; the
  page's own name unlinked/highlighted
- WhatsApp CTA: `https://wa.me/972509499241` (+ prefilled text per page)
- Footer: privacy / terms / accessibility + © line
- Accessibility widget enable script (the `?noacc=1`-switchable block) + the
  trigger-shrink block, copied as-is from `index.html`
- Cookie/UTM behavior comes with the copied scripts; nothing page-specific

## Per-page verification (task 6.2)
- [ ] all four tag IDs present and match ANALYTICS.md
- [ ] canonical matches the clean URL in sitemap
- [ ] JSON-LD parses; claims match visible content
- [ ] RTL renders; Pliant on numerals; no horizontal scroll at 375px
