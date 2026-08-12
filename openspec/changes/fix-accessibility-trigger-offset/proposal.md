# Fix the accessibility widget opening itself on short viewports

## Why

On any viewport shorter than 760px the Enable accessibility panel sits
permanently 40px open at the bottom of the screen. Nobody clicked it. It
overlaps the cookie bar and the page footer, and on a laptop it collides with
the macOS dock. Measured live on ezratlv.com at 1280x720: the panel's top edge
lands at y=680 in a 720px viewport, so a 40px strip of the open panel is always
on screen.

> **Revised after implementation.** Two premises below turned out to be wrong,
> and the browser is the authority, not this document:
>
> 1. **The trigger overhangs at every viewport height, not only short ones.**
>    The overhang is `panel height − trigger offset inside the panel` ≈ 30px,
>    and both terms are independent of viewport height, because the panel is
>    anchored to the viewport bottom. Fresh loads measured a 30px overhang at
>    720px *and* at 1000px tall. The original `@media (max-height:760px)` guard
>    was reading a symptom. So on any screen taller than 760px the old rule
>    never fired and the trigger was simply below the fold.
> 2. **The overhang is not a constant across devices.** At 375x812 the trigger
>    needs no correction at all: the panel is 591px tall there against 214px on
>    desktop, and the trigger's resting offset is 557px against 180px. Any
>    hardcoded nudge is wrong on one of the two.

The cause is our own override, not the vendor:

```css
@media (max-height:760px){ #enable-toolbar-content{bottom:40px!important} }
```

Enable closes the panel by pairing `bottom: 0` with
`transform: translateY(<panel height>)` — currently `translateY(213.891px)` for
a 214px panel. Those two values cancel exactly, putting the panel's top edge
flush with the viewport bottom. Forcing `bottom: 40px` breaks the cancellation
and leaves the difference visible. The rule targets the sliding panel when the
intent was to move the trigger button.

That intent was real, and deleting the rule alone regresses it. With Enable's
own `bottom: 0` restored at 1280x720, the trigger's bottom edge measures y=750
in a 720px viewport — 30px below the fold, clipped and unclickable. Enable
positions the trigger *inside* the panel container, so the closed-state
translate drags the trigger off screen with it. Losing the trigger is the worse
failure of the two: IS 5568 compliance rests on the site plus the accessibility
statement, but a helper users cannot reach is still a broken promise.

## What Changes

- Remove the `#enable-toolbar-content` override so Enable's closed-state
  geometry cancels exactly and the panel is fully off screen until clicked.
- Lift the trigger itself instead of the container it lives in, clamping it
  back inside the viewport on short screens.
- Measure rather than hardcode. The overhang is
  `panel height − trigger bottom offset` (≈34px today), both Enable-internal
  values that a vendor update can change without warning. A fixed pixel nudge
  is a guess with an expiry date.
- Apply to all four pages carrying the widget: `index.html`,
  `english-index.html`, `company-events.html`, `english-company-events.html`.

Not breaking. No change to the open panel, the trigger's appearance, the
existing `scale(.7)` shrink, or the session-dismiss X.

## Capabilities

**New Capabilities**

- `accessibility-widget` — the behaviour the Enable widget must honour on this
  site: closed until invoked, trigger always reachable, dismissible for the
  session. Nothing captured this before; it has now broken twice in the same
  place, once by being invisible and once by being half open.

**Modified Capabilities**

None. This is the first spec in the repo.

## Impact

- `index.html`, `english-index.html`, `company-events.html`,
  `english-company-events.html` — the inline `<style>` and `<script>` block
  that follows the Enable loader.
- `company-events-v2.html` and `english-company-events-v2.html` are live per
  ANALYTICS.md and carry **no** Enable widget at all. Out of scope here, but it
  means two live pages currently ship without the accessibility helper. Worth
  its own change.
- No effect on the Enable license, the accessibility statement pages, tracking,
  or the lead path.
- Third-party dependency: `cdn.enable.co.il`. The fix reads Enable's rendered
  geometry instead of assuming it, so a vendor layout change degrades to "no
  lift applied" rather than "panel stuck open".
