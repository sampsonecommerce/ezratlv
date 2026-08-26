# Tasks

All shipped and verified against the live board on 2026-08-25 unless noted.

## 1. Routing

- [x] 1.1 `OPEN_EVENTS_GROUP` = `group_mm6djw93`, read from the live board
- [x] 1.2 Unknown group on Open Events falls back to New Leads, never to the
      board default
- [x] 1.3 `events.html` posts the real group id

## 2. Column values

- [x] 2.1 Explicit `OE` map of the board's real column ids
- [x] 2.2 Status labels validated against the live board before sending
- [x] 2.3 Ad attribution written: Traffic Source, Campaign Name, Online campaign
      I.D, gclid, Marketing Approval
- [x] 2.4 Anchor the fallback builder's name match so it cannot select
      "Campaign Name"

## 3. Availability defects found while proving it

- [x] 3.1 Page to the end of the cursor (`next_items_page`), bounded at 2000
- [x] 3.2 Board-scope the committed-group id lists
- [x] 3.3 One shared `isCommittedGroup`, used by the feed and the mirror sync
- [x] 3.4 Dedupe `busy` on `date|start|end`

## 4. Board

- [x] 4.1 Recreate `Start Time` in position (`hour_mm6j2kcg`); retire the
      original `hour_mm6dy9b6` in place, values intact
- [ ] 4.2 Delete the retired `Start Time (ישן - להסרה)` column once the new one
      is confirmed populated across a full sync cycle

## 5. Verification

- [x] 5.1 `worker/test/open-events-lead.test.mjs`, built from the live board's
      ids, labels and field sets; fails against the previous worker on eleven
      counts
- [x] 5.2 Gate it in `deploy-worker.yml` before the deploy step
- [x] 5.3 Create a real item through the API with the exact payload the worker
      builds; confirm it lands in New Leads with every column filled
- [x] 5.4 Confirm the same date is **not** blocked in the live feed
