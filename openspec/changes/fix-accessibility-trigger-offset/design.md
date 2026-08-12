# Design

## Context

See `proposal.md` — Why, for the measurements and the root cause.

Constraints that shape the approach:

- No build step, no framework, no bundler. Every page is a standalone HTML
  file, and the widget block is inline `<style>` + `<script>` after the Enable
  loader. Four copies, one per page carrying the widget.
- Enable is a third-party script from `cdn.enable.co.il`. We do not control its
  markup, its class names, or when it mounts. It already changed shape once
  relative to the assumptions baked into the current override.
- The trigger lives *inside* the panel container, so anything applied to the
  container moves both. That coupling is the whole problem.
- The existing block already carries deliberate overrides that must survive:
  `scale(.7)` on the trigger, the hidden keyboard-shortcut label, and the
  session-dismiss X.

## Goals / Non-Goals

**Goals**

- Restore Enable's closed-state geometry untouched.
- Keep the trigger on screen on short viewports without hardcoding the
  overhang.
- Fail soft: if Enable's layout changes, degrade to no correction.

**Non-Goals**

- Replacing or reconfiguring the Enable widget.
- Adding the widget to `company-events-v2.html` and
  `english-company-events-v2.html` (flagged in the proposal's Impact, separate
  change).
- Factoring the duplicated block into a shared file. Tempting, and it would
  make the next fix a one-liner, but it changes how four live pages load their
  accessibility helper. That deserves its own change and its own review, not a
  ride along a bug fix.

## Decisions

### Correct the trigger, not the container

Enable parks the closed panel with `bottom: 0` plus
`transform: translateY(<panel height>)`. Those cancel exactly. Any site rule
that changes the container's `bottom` desyncs them by precisely that amount and
leaves it visible — which is the bug in one sentence.

So the container is off limits, and the trigger is corrected on its own.

*Alternative rejected:* keep the container override and hide the exposed strip
with `overflow` or a mask. Treats the symptom, keeps the desync, and would
clip the panel when genuinely open.

### Measure the overhang, do not hardcode it

The overhang is `panel height − trigger's bottom offset within the panel`,
≈34px at 1280x720 today. Both terms are Enable-internal. The current override's
`40px` was a reasonable read of that number at the time and is exactly the kind
of constant that rots silently.

The correction reads the trigger's own `getBoundingClientRect()` after mount
and lifts it by however much it overhangs, plus a small margin. Self-correcting
across viewport sizes, panel heights, and languages.

*Alternative rejected:* a CSS-only `@media (max-height:760px)` rule with a
fixed `translateY`. Zero JS, but it re-hardcodes the constant we just
established is unstable, and 760px is itself a guess — the real condition is
"the trigger overhangs", which CSS cannot express.

### Lift via `bottom` and `top`, never via `transform`

*Revised during implementation. The original plan here was to lift with
`translateY`, and it does not work.*

Enable declares `transition: transform .3s` on the trigger and animates that
property itself. A running transition outranks even an `!important` author
declaration in the cascade, so the lift is accepted into the inline style and
then silently ignored — verified in the browser: inline
`transform: translateY(-42px) scale(.7) !important` set, computed transform
still `matrix(0.7, 0, 0, 0.7, 0, 0)`, rect unmoved. Transform belongs to the
vendor on this element.

`bottom` sticks. But Enable pins **both** `top` and `bottom` on this absolutely
positioned button, so its height is derived from the pair rather than set
outright. Moving only `bottom` resizes it instead of lifting it — measured, a
23px trigger collapsed to 0px and vanished. Both offsets shift by the same
delta, which moves the button and leaves its height untouched.

Transitions are suppressed across the measure-and-set, because Enable
transitions `bottom` too and a read taken mid-animation yields the wrong
overhang.

### Wait for positioned, not merely present

The mount poll originally waited for the trigger to exist. For a few hundred ms
after insertion its computed `bottom` is `auto`, so the first measurement had
nothing to work against, bailed, and — the poll having already been cleared —
never ran again. The condition is now "exists **and** has a numeric `bottom`",
with the same bounded retry count.

### Poll for mount, reusing the pattern already in the file

The block already polls for `#enable-toolbar-trigger` on a 300ms interval with
a bounded retry count before attaching the dismiss X. The lift hooks the same
wait rather than adding a second timer. Bounded retries mean a widget that
never mounts costs nothing and leaves nothing behind.

*Alternative rejected:* `MutationObserver`. Cleaner in principle, but a second
mechanism watching for the same element the file already waits for, in a
codebase whose stated style is plain inline scripts.

### Re-evaluate on resize

A laptop gaining or losing browser chrome, or a phone rotating, changes the
viewport height after mount. The correction is recomputed on a debounced
`resize`. Without it the fix holds only for the height the page happened to
load at.

## Risks / Trade-offs

- **Enable ships a layout change and the trigger cannot be found** → the poll
  exhausts its retries and no correction is applied. Falls back to vendor
  default: trigger possibly clipped on short viewports, panel correctly closed.
  Strictly better than today's failure, where the panel is always open.
- **Enable starts applying its own transform to the trigger** → our
  `transform` would overwrite it. Mitigated by reading the computed transform
  and only composing when it is the expected `scale(.7)` or `none`.
- **Correction runs before Enable finishes its own positioning** → measurement
  is taken in the same poll tick that first sees the trigger, which is after
  mount but possibly before final layout. Mitigated by re-measuring on the
  first `resize` and by the correction being idempotent — recomputing from the
  live rect each time rather than accumulating offsets.
- **Four copies drift apart** → the spec's language-parity requirement is the
  guard, and the tasks apply the identical block to all four files in one pass.
  Real risk, accepted here, and the reason the de-duplication non-goal is
  written down rather than forgotten.

## Migration Plan

No data, no API, no config. Deploy is the normal Cloudflare Pages git
connection: merge to `main`, Pages builds and serves it.

Rollback is `git revert` of the one commit. The previous state is a visible
cosmetic bug, not an outage, so there is no urgency window to plan around.

Verify on the live site after deploy at 1280x720 and at a phone viewport, in
both Hebrew and English: panel fully off screen on load, trigger clickable,
panel opens and closes on click, dismiss X still works.
