# Tasks

Shipped in [#157](https://github.com/sampsonecommerce/ezratlv/pull/157). 3.3 and 3.4 are post-merge.

## 1. Server (worker is live; Pages function kept in parity)

- [x] 1.1 Private lead with neither phone nor email returns 400 before CAPI
- [x] 1.2 Empty phone / email columns omitted from `create_item`
- [x] 1.3 `deriveSource(d)` writes Traffic Source when the page sent `referrer`
- [x] 1.4 Referrer line in the notes blob
- [x] 1.5 `worker/test/private-lead.test.mjs`, gated in `deploy-worker.yml`

## 2. Page (index.html, then english-index.html in sync)

- [x] 2.1 Three-step markup, progress dots, sticky footer, `novalidate`
- [x] 2.2 Contact switch phone / email
- [x] 2.3 Inline validation per step
- [x] 2.4 Consent optional
- [x] 2.5 Awaited submit with `keepalive`, sending state, failure panel with
      retry and prefilled WhatsApp
- [x] 2.6 Full-height sheet under 600px, single scroller, cookie bar hidden
- [x] 2.7 Referrer capture and send
- [x] 2.8 Clarity custom events

## 3. Verify

- [x] 3.1 Worker test passes locally
- [x] 3.2 390px render: footer visible on every step, no horizontal scroll,
      errors show without native bubbles
- [ ] 3.3 One real submit each way (phone, email) lands on the board with the
      right Traffic Source
- [ ] 3.4 After a week: re-run the Clarity funnel query; Monday count should
      equal `SubmitForm` count
