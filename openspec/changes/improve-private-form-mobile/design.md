# Design

## Steps

| Step | Fields | Required |
|---|---|---|
| 1 מי חוגגים | name, contact (phone default / email), event type pills | name, contact |
| 2 מתי | date, time pills, guests | date, guests 1-60 |
| 3 עוד פרטים | age pills, callback pills, notes, consent | none |

Event type always has a value (default pill, `?type=` preselect kept).

## Validation

`novalidate` on the form. Each step validates on Next. An invalid field gets
`aria-invalid`, a red outline and a one-line Hebrew message under it, and is
scrolled into view and focused. Phone: at least 9 digits after stripping
punctuation. Email: `input.validity.valid`. Date: not empty, not in the past.

## Contact switch

Phone input shown by default. A text button under it, "מעדיפים אימייל?",
swaps to the email input and flips its own label to "חזרה לטלפון". The hidden
input is cleared and skipped. Payload carries whichever was filled; the other
is an empty string. Server requires at least one for `leadType: "private"`.

## Submit

```js
btn.disabled = true; btn.textContent = 'שולחים...';
const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
try {
  const r = await fetch(endpoint, { method: 'POST', headers, body, keepalive: true, signal: ctrl.signal });
  const out = await r.json().catch(() => ({}));
  if (!r.ok || out.ok === false) throw new Error(out.error || r.status);
  // pixel + gtag Lead here, not before
  show(done);
} catch { show(fail); } finally { clearTimeout(t); btn.disabled = false; btn.textContent = 'שליחת הבקשה'; }
```

`keepalive` keeps the request alive if the webview closes mid-flight. The
failure panel offers "נסו שוב" (back to step 3, values intact) and a WhatsApp
link with the name, event type and date prefilled.

## Layout

Panel is `display:flex; flex-direction:column`. `.cf-scroll` is `flex:1;
min-height:0; overflow-y:auto; overscroll-behavior:contain`. Footer is a
sibling after it, so it never scrolls away. At `max-width: 600px` the modal has
no padding, the panel is `height:100%`, `border-radius:0`, `max-width:none`.
`body.pf-open .cookie-bar { display:none }`.

## Source derivation (worker + Pages function)

```
utm_source present and not "website"  -> unchanged
referrer undefined (old cached page)   -> unchanged
referrer ""                            -> direct
host ends ezratlv.com                  -> website
google.*                               -> google_organic
bing.com                               -> bing_organic
instagram.com (l./m. stripped)         -> instagram
facebook.com / fb.com                  -> facebook
otherwise                              -> host
```

Written to Traffic Source (`short_textgjnrhjdi`). Referrer also appended to the
notes blob. Page captures `document.referrer` into `sessionStorage` on first
load so in-site navigation does not overwrite it.

## Clarity events

`clarity('event', name)` for `pf_open`, `pf_step2`, `pf_step3`, `pf_submit`,
`pf_success`, `pf_fail`. Guarded on `window.clarity`.
