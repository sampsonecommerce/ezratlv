# Design

## Webhooks to register

All point at `https://ezra-lead.yeheli.workers.dev/?hook=monday&key=<MONDAY_WEBHOOK_KEY>`.

| Board | Events |
|---|---|
| Open Events `5102602771` | `create_item`, `item_deleted`, `item_archived`, `item_restored`, `item_moved_to_any_group`; `change_status_column_value` on `color_mm6d8eqs` (Status) and `color_mm6dh5pe` (Time of event); `change_specific_column_value` on `date_mm6djw2v`, `hour_mm6j2kcg`, `hour_mm6d1kst` |
| Events Form `5092854682` | the item events above; `change_status_column_value` on `color_mm18ym70` (Status) and `single_select943s5p9` (Time of event); `change_specific_column_value` on `date5bab58wj`, `hour_mm1q610q`, `hour_mm1qa44s` |
| Company Events `5099350637` | same as Events Form (same column ids) |
| Schedule board `5103189386` | `create_item`, `item_deleted`, `item_archived`; `change_status_column_value` on `color_mm7fd9hh` (סוג פריט) and `color_mm7fr9sh` (אישור תוכן); `change_specific_column_value` on `date_mm6qf10d` |

Notes, phones and every other column fire nothing.

## Board automations (Open Events, edited by hand)

1. The lock `1719130649`: condition changes from "זמינות תאריך is not פנוי" to "is any of
   תפוס - פרטי, תפוס - פתוח". An unchecked date no longer bounces a closing; it waits seconds for
   the check.
2. A second handoff: when זמינות תאריך changes to פנוי, and Status is Closed Deal, and Schedule
   Item is empty, the same action as `1719131017`. The empty-link guard keeps it to one item.
3. A second lock: when זמינות תאריך changes to תפוס - פרטי or תפוס - פתוח, and Status is Closed
   Deal, set Status to In Contact and notify.

## Debounce

None. `caches.default` is a no-op on workers.dev, so there is nothing cheap to coordinate
on, and the passes are idempotent label writes. A burst of webhooks re-reads the boards a few times.
If monday's complexity budget ever complains, the next step is a Durable Object lock.
