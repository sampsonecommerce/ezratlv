# Design

See the hub change `add-open-events-content-pipeline` (design D1, D6) for the
approach. Worker-level notes only:

- **Shared rule.** `collectBusy()` returns slots tagged with board, item and
  group, and `availability()` strips the tags before responding, so the feed's
  shape is unchanged. The `זמינות תאריך` writer uses the same slots, which is
  what makes "the board and the site agree" true by construction.
- **Classifying a clash.** A slot from Events Form, Company Events or the Open
  Events mirror group is private; any other committed Open Events slot is an
  open event. When the mirror group is retired, the second half of that rule
  becomes dead code and goes with it.
- **Writes.** One `change_multiple_column_values` per changed lead. On
  2026-09-23 there is one open lead, so the first run writes about one value.
- **Proxy allow-list.** One paged read of the schedule board (website and
  approval status, item assets, subitem assets), cached per isolate for 5
  minutes. The site already had edge-cached bytes; the allow-list sits in front
  of that cache.
