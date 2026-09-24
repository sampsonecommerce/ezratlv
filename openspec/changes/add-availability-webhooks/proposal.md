# Availability checks run on monday webhooks, not only every 15 minutes

Derived from the hub change `add-open-events-content-pipeline` (private hub repo). This change is
the worker's part of it and does not restate the hub's requirements.

## Why

`זמינות תאריך` was written only by the 15-minute cron. On 2026-09-24 a lead arrived from the site at
08:57:05 and was set to Closed Deal at 08:57:53, before any check: it still read `לא נבדק`, so the
board's lock (Closed Deal on a date that is not `פנוי` goes back to In Contact) sent a free date
back. Two gaps sit behind it: the check is slow, and a lead that is closed before it is checked is
never checked, because committed leads were skipped (they would have clashed with their own
promoted copy on Events Form).

## What Changes

- `POST /?hook=monday&key=<MONDAY_WEBHOOK_KEY>` receives monday board webhooks. It echoes monday's
  verification challenge, refuses a wrong key (401) and an unconfigured worker (503), and runs the
  availability passes (`זמינות תאריך`, placeholders) in the background. The payload is only a
  nudge: the passes re-read every board. Promotion and the mirror stay on the cron alone, because
  two webhooks landing together could both create the same copy.
- A committed Open Events lead that still reads `לא נבדק` is judged once. A lead already judged
  keeps its answer.
- A lead is never judged against its own promoted copy on Events Form (matched by its marker
  `5102602771:<id>`), and a promoted open event counts as an open event, not a private booking,
  for every other lead (`תפוס - פתוח`, not `תפוס - פרטי`).
- The cron stays at 15 minutes as the net for a lost webhook.
- New CI gate: `availability-webhook.test.mjs`; `date-availability.test.mjs` covers the new rule.

## Impact

- Worker build `2026-09-24b`. New secret `MONDAY_WEBHOOK_KEY` (set with `wrangler secret put`).
- monday: webhooks on four boards (see design.md), and two board automations change in the
  editor so an unchecked date waits for the check instead of bouncing (see design.md).
