# Capture events-page enquiries on the board they belong to

## Why

Every enquiry from ezratlv.com/events was posted with `group: "topics"`. That is
Monday's default id for the first group of a brand-new board, and it exists on
**none** of our three boards - all of their groups were renamed years ago and
carry `group_mm*` ids.

`create_item` does not reject an unknown `group_id`. It files the item in the
board's top group and returns a normal success. On Open Events the top group is
`תאריכים תפוסים`, so every enquiry became an invisible **blocked date** rather
than a lead, and the site reported success either way. On 2026-08-25 the board
held no real lead from this path at all.

Two further defects surfaced while proving it, both in the availability feed
that the same worker serves:

- **`items_page` returns one page.** It asked for 100 items against an Events
  Form holding 226, so 126 bookings were invisible to the public calendar and
  their dates read as free.
- **Group ids are not unique across boards.** `group_mm18zcww` is *New Leads* on
  Events Form and *Packages (In Agreement Process)* on Company Events. The id
  lists were tested against every board, so Events Form's New Leads counted as
  committed - and since `PRIVATE_GROUP` is that same id, **every private
  homepage lead was blocking its own requested date**.

## What Changes

- Enquiries land in **New Leads** (`group_mm6djw93`), read from the live board.
- An unknown group id on Open Events falls back to New Leads rather than to the
  board default, because "default" on that board means "cancel a date". Browsers
  hold a cached `events.html`, so the retired id keeps arriving after a deploy.
- Column values are written by **real column id**, not guessed by column type.
  The type-guessing builder never wrote gclid, Traffic Source, Campaign Name,
  Online campaign I.D, Marketing Approval, Status or Time of event - and its
  name heuristic `/שם|name/i` matched the column titled **"Campaign Name"**, so
  the customer's name went into the campaign column.
- Status labels are still validated against the live board before being sent, so
  adding a label in Monday starts working with no redeploy.
- The availability feed pages to the end of the cursor, and its committed-group
  rule is board-scoped and shared with the mirror sync so the two cannot drift.

## Non-goals

- Changing which groups count as committed. The definition is reused, not
  redefined.
- The newsletter and RSVP paths, which share the board but not this bug.

## Impact

- `worker/ezra-lead-worker.js`, `events.html`, `.github/workflows/deploy-worker.yml`
- Shipped as [#80](https://github.com/sampsonecommerce/ezratlv/pull/80),
  [#81](https://github.com/sampsonecommerce/ezratlv/pull/81),
  [#82](https://github.com/sampsonecommerce/ezratlv/pull/82),
  [#85](https://github.com/sampsonecommerce/ezratlv/pull/85)
