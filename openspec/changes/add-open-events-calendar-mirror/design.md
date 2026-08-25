# Design

## What counts as committed

Reuse the availability feed's own definition, so the board and the calendar
cannot drift apart. A source group is committed when its title contains
`תפוס`, `סגור`, `closed`, `booked`, `deal`, `pre payment`, `prepayment`,
`proposal` or `agreement`, or when its id is listed in `AVAIL_GROUPS` /
`COMPANY_AVAIL_GROUPS`.

That resolves today to:

| Board | Groups |
|---|---|
| Events Form `5092854682` | Closed Deals, Pre Payment, Proposal Sent |
| Company Events `5099350637` | Closed Deals, Pre Payment (Signed Agreement), Packages (In Agreement Process), Agreement Sent (Active For 24h) |

If someone renames a group, the same rule moves both the mirror and the
calendar. One definition, one place.

## Field map

Both source boards use the same column ids for everything needed here, so one
map covers both.

| Meaning | Source | Open Events |
|---|---|---|
| Event date | `date5bab58wj` | `date_mm6djw2v` |
| Start / End time | `hour_mm1q610q` / `hour_mm1qa44s` | `hour_mm6dy9b6` / `hour_mm6d1kst` |
| Start-End text | `text_mm4t1h0s`, else `text_mm2km76j` | `text_mm6d8r2y` |
| Event type | `single_selecta6erdt9` | `color_mm6dn79a` |
| Time of day | `single_select943s5p9` | `color_mm6dh5pe` |
| Guests | `numeric_mm1qj01x`, else `number0kzol2wl` | `numeric_mm6d85m` |
| Notes | `long_textlwbyhlq0` | `long_text_mm6d2npw` |
| Provenance | `<boardId>:<itemId>` | `Source Item` (new text column) |

Status labels are validated against the live Open Events board before they are
sent. `create_labels_if_missing` stays `false`, so an unrecognised event type
falls back to `אחר` rather than failing the write and losing the mirror.

## Money never crosses

Copying is allow-list, not deny-list: a column that is not in the map above is
not copied, so a new price column added to a source board tomorrow cannot leak
by default. Belt and braces, the notes text is filtered line by line and any
line matching `₪`, `ILS`, `מחיר`, `עלות`, `תשלום`, `מקדמה`, `הנחה` or `סה"כ`
is dropped before the write.

The Open Events board does have its own price columns. The sync never writes
them; staff working a real booking on that board still can.

## Ownership and the deletion rule

The sync owns exactly the items carrying a `Source Item` value and nothing else.

- source committed, no mirror → create
- source committed, mirror exists, fields differ → update
- mirror exists, source no longer committed (cancelled, moved back to a lead
  group, deleted) → remove the mirror
- item with an empty `Source Item` → **never touched**, whatever group it is in

That last line is the invariant that makes this safe to run unattended. A lead
that arrived through the website and was promoted to Closed Deals on this board
has no `Source Item`, so it is native, and the sync will not remove it as a
stale mirror. Removal is `delete_item`, which lands in Monday's recycle bin and
is recoverable for 30 days; it is not a hard delete.

## Trigger

A Cloudflare cron on the existing worker, every 15 minutes, plus the same code
reachable on demand behind `CALC_SECRET` for a manual run and for verification
after a deploy. A Monday webhook would make this immediate and is the obvious
follow-up, but it needs a public unauthenticated endpoint with challenge
handshake and signature checking, which is a larger surface than this change
should open.

Fifteen minutes is chosen against what the board is for: a date being taken is
not a fact that changes by the second, and the availability feed already reads
the source boards live on every request, so the public calendar is never stale
regardless of the sync.

## Double counting

Availability reads all three boards. Once mirrors exist, a committed event is
counted twice - once at its source, once as its mirror. `booked` is a Set so
dates are unaffected; `busy` gains duplicate entries for the same date and
hours. Dedupe `busy` on `date|start|end` before returning it. This is a
pre-existing wart the mirror makes visible, not one it creates.
