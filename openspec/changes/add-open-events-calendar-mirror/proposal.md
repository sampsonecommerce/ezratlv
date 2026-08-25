# Make the Open Events board the money-free calendar of everything happening

## Why

The Open Events board (`5102602771`) was built to hold enquiries from
ezratlv.com/events. Until 2026-08-25 it held none: the worker posted group
`topics`, which exists on no board of ours, so Monday filed every enquiry in the
board's top group, `תאריכים תפוסים`. That is fixed (`2026-08-25a`).

What the board still is not is what it is for. Twenty-one placeholder items
reading `🔒 אירוע סגור` stood in for the real calendar, carrying a date and
nothing else. They were deleted on 2026-08-25. The board is now empty, and the
events that actually fill the venue live on two other boards - `Events Form`
(`5092854682`) and `Company Events` (`5099350637`) - mixed in with prices,
contracts, pre-payments and margins.

So there is no single place to answer "what is happening at Ezra, and when",
and nowhere the website could safely read from even if it wanted to. The two
source boards cannot be that place: they are full of money.

## What Changes

- **Committed events mirror into the Open Events board**, money stripped. The
  set of "committed" is exactly the set the availability feed already treats as
  booked, so the board and the calendar can never disagree.
- **Mirrors carry only what an event is**: date, start and end time, event type,
  time of day, guest count, and notes with every price line removed. No total,
  no per-head, no pre-payment, no discount, no contract.
- **New enquiries keep landing in New Leads** and move through the board's
  existing thirteen pipeline automations. An enquiry that becomes a real event
  is already on this board - it is never mirrored, it is promoted.
- **Mirrors are disposable and owned by the sync.** A new `Source Item` column
  holds `<boardId>:<itemId>`. The sync creates, updates and removes items that
  carry that marker and touches nothing else on the board, ever.
- **The public site does not change.** ezratlv.com/events keeps showing only
  that a date and hour are taken. Mirrored detail is for staff on a private
  board; a customer's notes are not published because they were copied.

## Non-goals

- Rendering upcoming events or the past-events gallery from this board. Both are
  still hardcoded on `events.html`. That is the next change, and it needs
  publish-gating and image fields this one does not add.
- Real-time push. A Monday webhook would be strictly better than polling and is
  worth doing later; a cron gets the board correct within minutes with no public
  unauthenticated endpoint to secure.
- Any change to how the availability feed decides a date is taken.

## Impact

- `worker/ezra-lead-worker.js` gains a `scheduled()` handler and a sync module.
- `worker/wrangler.toml` gains a cron trigger.
- Open Events board gains one column, `Source Item`.
- No page changes. No pricing, no supplier terms, no credentials in this repo.
