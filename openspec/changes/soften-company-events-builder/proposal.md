# Company events: a builder that ends in an estimate, not a contract

## Why

Clarity, 2026-08-08 to 2026-09-07, /company-events:

| Step | Sessions |
|---|---|
| Page sessions | 754 (574 Meta mobile, 25% scroll, 19 s) |
| Tapped a package CTA | 152 |
| Reached the wizard | 52 |
| Passed the date + time gate | 35 |
| Reached the details step | 11 |
| Sent | 1 |

Where they stop:

- **Date and a 3 or 5 hour slot are required on step 2**, before the menu,
  the guests or the price. 20 dead taps on "המשך" in the wizard, 53 on the page.
- **Price appears on step 5 as a total** after a slider. Last clicks before
  leaving: "אורחים ₪6,000", "₪5,500".
- **Step 6 reads like signing.** Name, company, phone, email, address, notes,
  a mandatory marketing consent, and a checkbox "talk to sales before signing"
  that ejects into another form. The confirmation promises a contract by email
  valid 24 hours and a deposit call.
- **Menu tabs are dead**: 85 taps in the wizard, 55 dead; 106 taps on the
  page, 108 dead.
- **Leaving leaves nothing.** 25 sessions end on the wizard, 10 tap "יציאה
  ללא שמירה". No capture on exit.
- **Guests are silently clamped** to 20 to 50, no path for anything else.
- FAQ opens: "כמה עולה" 38, "אפשר לסגור תאריך ומחיר" 28, "מה כלול" 28.

The flow asks for commitment first and shows value last. The owner's brief:
no money and no contract inside the flow; build your own event, or talk to
us; all copy, menus, prices and add-ons stay.

## What Changes

- **Order**: plan, guests, menu, add-ons, date, details. Price is a running
  estimate in the footer from the first step, labelled not binding.
- **Date is optional.** Availability shown as information. A "skip" link.
- **Details step is a request for an offer.** Name plus phone or email
  required. Company and notes optional. Address removed. Consent optional.
  The "talk to sales before signing" ejector becomes a plain link. Button:
  "שלחו לי הצעה". Receipt is titled as an estimate.
- **Confirmation**: an offer within one business day, WhatsApp button. No
  contract, no 24 hours, no deposit.
- **Honest submit**: awaited, `keepalive`, success only on `ok`, retry and
  WhatsApp on failure. Same for the talk form.
- **Exit capture**: closing the wizard after a plan is picked offers to send
  the estimate by WhatsApp with one phone field; that is a soft lead.
- **Soft lead on typed details**: once name and a contact exist on the
  details step, an `incomplete` lead is posted once; a completed request
  deletes it so sales never follows up twice.
- **Guests outside 20 to 50** are allowed and shown a "נבנה משהו מותאם" path
  into the talk form instead of being rewritten.
- **Gate screen removed.** Package cards and page CTAs open the builder; the
  talk door is on the page. Ad deep links land on the guests step with the
  plan preselected.
- **Page**: "לבחירת חבילה" becomes "מרכיבים אירוע" everywhere and opens the
  builder instead of scrolling. Package price caption reads "לאדם, לפני
  תוספות". The menu tabs get a working handler.
- **Worker**: a completed request lands in a new "Estimate Requested" group,
  not "In Agreement Process", so the contract automation does not fire
  before a human call. Clarity custom events on every step and outcome.

## Non-goals

- Prices, menus, add-ons, plan definitions. Untouched in
  `ezra-booking-engine.js`.
- The custom 450+ modal, the open-events form, the private form.
- Page weight.

## Impact

- `company-events.html`, `company-events-v2.html`, English mirrors.
- `worker/ezra-lead-worker.js`, `functions/api/submit-lead.js`.
- Monday: new group "Estimate Requested" on Company Events.
