# Tasks

## 1. Remove the broken override

- [x] 1.1 Delete the `@media (max-height:760px){ #enable-toolbar-content{bottom:40px!important} }` rule and its explanatory comment from `index.html`
- [x] 1.2 Delete the same rule from `english-index.html`
- [x] 1.3 Delete the same rule from `company-events.html`
- [x] 1.4 Delete the same rule from `english-company-events.html`

## 2. Lift the trigger instead

- [x] 2.1 Write the correction: measure the trigger's overhang past the viewport bottom and shift it back inside
- [x] 2.2 Use `bottom` + `top`, not `transform` — Enable transitions transform and a running transition outranks `!important`, so a transform lift is silently swallowed
- [x] 2.3 Shift both offsets by the same delta — Enable pins top and bottom, so moving one resizes the button to zero height instead of lifting it
- [x] 2.4 Suppress transitions across the measure-and-set, since Enable transitions `bottom` and a mid-animation read gives the wrong overhang
- [x] 2.5 Store the vendor's resting offsets once so repeated runs never stack
- [x] 2.6 Bail without touching anything if the offsets are not numeric — vendor layout changed
- [x] 2.7 Wait for the trigger to be *positioned*, not merely present; its `bottom` is `auto` for the first few hundred ms
- [x] 2.8 Hook into the existing bounded mount poll rather than adding a second timer
- [x] 2.9 Re-run on a debounced `resize`, on trigger click, and on two short delays after mount
- [x] 2.10 Correct only a genuine overhang; leave an already-visible trigger where the vendor put it
- [x] 2.11 Apply the identical block to all four pages

## 3. Verify against the spec

- [x] 3.1 At 1280x720: panel top at y=720 in a 720px viewport — fully off screen, nothing overlapping the cookie bar or footer
- [x] 3.2 At 1280x720: trigger at 685–708, fully inside the viewport, 23px tall
- [x] 3.3 Opened to its full 214px (top y=506), closed again to fully off screen; lift correctly backed off while open
- [x] 3.4 At 1280x1000: panel off screen, trigger at 965–988 visible. Found the overhang is height-independent (~30px at both 720 and 1000), so the original short-viewport premise was wrong
- [x] 3.5 At 375x812: panel 591px tall and fully off screen, trigger at 766–809 visible, lift 0 — mobile needs no correction, which is why the offset must be measured rather than hardcoded
- [x] 3.6 Resize after load: debounced handler re-measured and kept the trigger visible
- [x] 3.7 Dismiss X hid both widget and control, `ezraAccHide` session flag set
- [x] 3.8 `english-index.html` at 1280x720: identical results, lift 42

## 4. Land it

- [ ] 4.1 Verify against the live site once Cloudflare Pages has deployed
