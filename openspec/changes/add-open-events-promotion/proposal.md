# Route a music lead to Moshe, and promote a real one into the pipeline

## Why

Open Events captures enquiries from `/events` and categorises them. Two facts
about how Ezra actually works make it more than a second inbox:

- **Music evenings are worked by somebody outside the company.** Moshe
  (`Mozes@onestudios.co.il`) books the shows and the vinyl nights. He settles
  music, not catering, contracts or price. He should not be sent into Events
  Form, where the sales manager works and where every board carries money.
- **Events Form stays the pipeline of record.** The sales manager is not moving
  off it, and Eylam needs to see a real evening coming regardless of who booked
  it.

There is also a trap. A music evening is frequently committed with **no
payment** - the venue invites the act. So "has a prepayment" cannot be the test
for whether something is real. Commitment is a **status**, and money is optional
evidence for it.

## What Changes

- **Routing by event type.** `הופעה` (a show) and `מסיבת השמעה` (a listening
  party or DJ set) assign Moshe in a new `Owner` column and notify him. He works
  the whole lead on Open Events, which is safe to share with a non-employee
  precisely because the mirror strips money from it.
- **Promotion on status.** When a lead reaches Proposal Sent, Pre Payment or
  Closed Deal, a copy is created on Events Form so the sales side sees it.
- **Ivchu keeps exactly one inbound path.** The promoted copy reaching Closed
  Deal fires Events Form's existing guarded automation `1717403286`
  (*create item and connect boards*, gated on "if column is empty"), which is
  already the account's only idempotent route onto the operations board
  `5093634851`. Open Events does **not** write Ivchu directly. Duplication is
  impossible by construction rather than prevented by a check.
- **The promotion cannot loop.** A promoted copy sits in a committed group on
  Events Form, so the mirror sync would copy it back onto Open Events - the same
  event twice, once as the lead that started it and once as a mirror of its own
  copy. Events Form gains a `Source Item` marker column and the sync skips any
  committed item carrying one.

## Non-goals

- Moving the sales manager off Events Form.
- Any money on Open Events. It stays the money-free board, which is what makes
  guest access to it safe.

## Impact

- **Worker:** the loop guard, shipped as
  [#98](https://github.com/sampsonecommerce/ezratlv/pull/98).
- **Boards, live:** `הופעה` label on Event type (both boards, Moss Town
  relabelled); `Owner` people column on Open Events
  (`multiple_person_mm6kph0b`); `Source Item` text column on Events Form
  (`text_mm6ktd3a`).
- **People:** Moshe as a board guest on Open Events only; Eylam and the sales
  manager unchanged on Events Form.
- **Not built:** the two Monday automations. They are specified in design.md and
  the worker tolerates them without depending on them.
