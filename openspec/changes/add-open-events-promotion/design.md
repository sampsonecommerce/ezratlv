# Design

## Commitment is a status, not a payment

An invited show closes with no money attached and still occupies the room, still
blocks a slot, still needs staffing. Any rule keyed on a prepayment column
misses exactly the events Moshe books.

So the trigger everywhere is **status**. `Closed Deal` means "this is happening",
whether it closed with a prepayment or with an invitation.

## The flow

```
        ezratlv.com/events
                 │  leadType: open_events
                 ▼
        Open Events · New Leads
                 │
      Event type = הופעה / מסיבת השמעה
                 │  assign Owner = Moshe, notify
                 ▼
        Moshe works the lead here
        (date, slot, sound, entry type, publish fields)
                 │
      status = Proposal Sent / Pre Payment / Closed Deal
                 │  create on Events Form, carrying Item ID → Source Item
                 ▼
        Events Form  ── the sales pipeline of record
                 │  status = Closed Deal
                 │  automation 1717403286, guarded "if column is empty"
                 ▼
        Events (Ivchu) 5093634851 · staffing and event-day money
```

## Why Ivchu is reached only through Events Form

An earlier plan had Open Events writing Ivchu directly *and* pushing into Events
Form. Both paths end at Ivchu, so the event arrives twice, and the existing
"if column is empty" guard does not help - it checks a different column on a
different board.

One inbound path removes the failure instead of defending against it. Ivchu items
are only ever born from Events Form, where the guard already blocks re-fires.

**If promotion ever needs to land on Events Form already at `Closed Deal`**, that
fires `1717403286` immediately, which is correct - one Ivchu item, once. What
must never be added is a second, direct Open Events → Ivchu automation.

## The loop guard

Without it, promotion is a cycle:

1. Lead on Open Events reaches Closed Deal
2. A copy is created on Events Form, in a committed group
3. `syncMirror` sees a committed item on a source board and mirrors it onto Open
   Events
4. Open Events now holds the lead **and** a mirror of its own promoted copy

Events Form's `Source Item` (`text_mm6ktd3a`) is written by the promotion, and
the sync skips any committed item carrying **any** non-empty value there. Any
value, not a parsed `<board>:<item>` form: the column exists solely for this
marker, and Monday's create-item recipe may only be able to map a bare item id.

Items created any other way have it empty and mirror exactly as before. The
assertion lives in `worker/test/mirror-sync.test.mjs` as a committed,
origin-marked item that must never come back.

## The two automations

Monday UI, on **Open Events**. The worker does not depend on these; it tolerates
them.

**1. Route music to Moshe** - two rules, same shape:

> When **Event type** changes to **הופעה** → assign `Mozes@onestudios.co.il` in
> **Owner**, and notify.
> When **Event type** changes to **מסיבת השמעה** → same.

**2. Promote to Events Form** - three rules, same shape:

> When **Status** changes to **Proposal Sent** / **Pre Payment** / **Closed
> Deal** → create an item in **Events Form** in the matching group, mapping:
> name, Requested event date, Start Time, End Time, Event type, Time of event,
> guests, phone, email, **and Item ID → Source Item**.

The Item ID → Source Item mapping is the loop guard. If the recipe editor cannot
express it, promotion must move into the worker instead - do not ship the
promotion without a marker.

## Why Open Events is safe to share

Moshe is not an employee. He gets guest access to Open Events and nothing else.
That is only defensible because the mirror sync strips money by allow-list: the
board carries dates, hours, type and guest counts, and no price, total, per-head
figure, pre-payment or discount. The board built for the public site turns out to
be exactly the board safe to hand to an outside collaborator.

The Ivchu board is the opposite and must never be shared this way: it exists to
hold event-day money.
