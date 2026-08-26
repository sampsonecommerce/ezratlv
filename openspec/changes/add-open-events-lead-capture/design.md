# Design

## Never guess a Monday id

Three separate defects in this change reduce to the same mistake: an id was
assumed rather than read. `topics` was assumed. The column map was assumed to
transfer from another board. Group id lists were assumed to be board-agnostic.

The rule the code now follows: **read the live board, then write.** `boardSchema`
is fetched and cached per isolate, every column id is checked against it, and any
id the board does not have is dropped so the lead still saves rather than the
whole mutation failing.

## Why the fallback is New Leads, not "no group"

Monday's own default is the board's top group. On Open Events that is
`תאריכים תפוסים`, so falling through to the default converts a lead into a
blocked date - worse than the error it was recovering from. When the requested
group is unknown, the worker uses its own constant instead, and only gives up on
the group if that too is missing from the board.

## Column mapping

Written against the live board (2026-08-25). Anything not listed is not written.

| Field | Column |
|---|---|
| Phone | `phone_mm6dxgj2` |
| Email | `email_mm6dwhjs` |
| Requested date | `date_mm6djw2v` |
| Guests | `numeric_mm6d85m` |
| Event type | `color_mm6dn79a` |
| Status | `color_mm6d8eqs` (`New Lead`) |
| Time of event | `color_mm6dh5pe` |
| Start / End | `hour_mm6j2kcg` / `hour_mm6d1kst` |
| Start-End text | `text_mm6d8r2y` |
| Traffic Source | `text_mm6da5k0` |
| Campaign Name | `text_mm6dkmdg` |
| Online campaign I.D | `text_mm6d2cwt` |
| gclid | `text_mm6dreje` |
| Marketing Approval | `boolean_mm6d7ret` |

`Start Time` is `hour_mm6j2kcg`, not the board's original `hour_mm6dy9b6`.
Monday exposes no mutation that moves a column - only
`create_column(after_column_id)` - so restoring the `Start Time | End Time |
Start-End` order the other boards use meant creating the column anew in
position. The original is retired in place and still holds its values.

The type-matching builder survives as a last resort for a board restructured out
from under us, with its name match anchored so it can never again select
"Campaign Name".

## Slot granularity is load-bearing

Ezra runs up to two events a day. A date being taken in the afternoon must leave
the evening sellable, so the feed emits `busy` windows and not only `booked`
dates. Where the hour columns are empty the range is recovered from the
`Time of event` label; the "both halves taken" fallback is the last resort, and
it is what a missing range degrades into, so a missing range is expensive.

`busy` is deduped on `date|start|end` because a committed event and its mirror
are the same booking read twice.
