# Make the private-event form honest, and finishable on a phone

## Why

Clarity, 2026-08-08 to 2026-09-07, sessions with `utm_source` containing
`instagram` (almost all in the Instagram in-app browser):

| Step | Sessions |
|---|---|
| Sessions | 189 |
| Opened the form ("לבדיקת זמינות") | 68 |
| Tapped "שליחת הבקשה" | 38 |
| Clarity `SubmitForm` | 36 |
| Leads on the Private Events board from Instagram | 29 |

Two recordings from 2026-09-06 show the two failure shapes:

- **A lie on success.** A bio-link visitor filled every field, tapped send,
  saw "קיבלנו, תודה!", closed the tab two seconds later. The board has no
  item. The page fires `fetch` without `keepalive`, never reads the response,
  and shows the success panel unconditionally. When the in-app browser closes
  on a slow connection the request dies in flight. About one in five Instagram
  submits never lands.
- **Stuck below the fold.** A ManyChat DM visitor typed name, phone, email,
  picked a time, then tapped one element four times, gave up, came back three
  minutes later, retyped the first fields in four seconds (autofill) and left
  after eight seconds. The form is 1451px tall inside a 674px scroll box, a
  nested scroller inside a fixed modal, with the submit button and a mandatory
  marketing-consent checkbox at the very bottom, under the cookie banner.

Related: every lead without a UTM is written as `website / private_form`, so a
Google-organic lead and a WhatsApp-shared link are indistinguishable on the
board. The page never sends the referrer.

## What Changes

- Submit awaits the response, sends with `keepalive`, and shows success only
  on `ok`. Failure shows a retry and a prefilled WhatsApp link. The button
  reads "שולחים..." while in flight.
- Same questions, three short steps: who, when, details. One contact field,
  phone by default with a "prefer email" switch. Progress dots and a sticky
  footer with Back / Next / Send that is always on screen. Native `required`
  bubbles are replaced by inline Hebrew errors, because the Instagram webview
  does not show them reliably.
- Marketing consent stays as a question but is optional. It no longer blocks
  the lead.
- On phones the modal becomes a full-height sheet: one scroller, no nested
  scroll, `overscroll-behavior: contain`, cookie banner hidden while open.
- The page sends `referrer`. The worker derives Traffic Source when no UTM is
  present: `google_organic`, `direct`, `instagram`, `facebook`, or the referring
  host. `website` is kept only for in-site navigation.
- The worker accepts a lead with phone or email, not both, and omits the empty
  column instead of writing an empty value.
- Clarity custom events on open, each step, submit, success and failure so the
  funnel above can be re-read after deploy.

## Non-goals

- Removing questions. Every field the board has today is still asked.
- The company-events wizard and the open-events form. Same fixes may apply
  later, not in this change.
- Page weight. The 7.6 s load in the Instagram app is real and separate.

## Impact

- `index.html`, `english-index.html`: popup style, markup, script.
- `worker/ezra-lead-worker.js`, `functions/api/submit-lead.js`: contact
  validation, empty-column omission, source derivation, referrer in notes.
- `worker/test/private-lead.test.mjs`, gated in `deploy-worker.yml`.
- ManyChat: the DM link should carry `?type=<event>#book` so the first pill is
  preselected. Setting lives in ManyChat, not in this repo.
