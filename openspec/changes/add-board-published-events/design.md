# Design notes

## Why a checkbox, and why default-off

A private birthday and a public chef evening sit in the same committed group
and share every other field. The checkbox is the only thing separating "this
date is taken" from "this date is taken by something we announce". Default-off
means a new booking cannot become public by accident - only by a person
deciding it should be. The failure mode of forgetting to tick is a public
evening that stays undescribed; the failure mode of the opposite default would
be a customer's private party published. Asymmetric, so the default is not a
matter of taste.

## Why `public[]` rides the availability response

One request, one cache entry, and no interval in which the page knows a date is
taken but not yet why. A separate endpoint would make that interval a permanent
feature of every page load. A failed published-events read degrades to an empty
list rather than failing the response: the calendar is the part that must not
break.

## Why the worker sanitises board content

A board column must not become an arbitrary instruction to a public page.
Anyone with board access could otherwise point the site's own `<img>` at any
host, or hand a visitor a `javascript:` href. So: image paths are repo-relative
only (absolute, protocol-relative and `..` dropped), links are `https` only.
Enforced in the worker, not the page, so every consumer inherits it.

## Why one shared map on the page

Three renderers describe the same evening - hero spotlight, 30-day strip, month
grid. Fed separately they will eventually disagree, and the hero is above the
fold, so its version is the one people believe. `ezraPublished` is a single
date-keyed map with a subscriber list; the feed writes it once and every
renderer re-renders from it.

## Why reservations land in New Leads

New Leads is not a committed group, which is exactly the point: holding a seat
at a published evening must never mark that evening's date unavailable to
everyone else. The reservation is a lead like any other - no price, no
contract, confirmed by a person. A failed send tells the visitor plainly and
offers WhatsApp, because a seat that is not held must not read as held.

## What the mirror sync does and does not touch

The sync writes none of the publish columns - it only sets the keys it is
handed - so hand-written public copy survives every sync pass. It does not
survive the source event leaving its committed group: that deletes the mirror
item outright and the copy with it. Accepted: a cancelled evening should
disappear from the site, and re-publishing a re-committed one is a person's
decision anyway.
