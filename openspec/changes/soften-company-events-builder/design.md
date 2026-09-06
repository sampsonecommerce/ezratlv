# Design

## Step order without renumbering

The wizard's steps, draft state, GA4 names and the resume flow all key on
step ids 1 to 7. Renumbering is a wide blast radius. Instead:

```js
const ORDER = [1, 5, 3, 4, 2, 6];        // plan, guests, menu, add-ons, date, details
const posOf  = n => ORDER.indexOf(n) + 1;
const nextOf = n => ORDER[ORDER.indexOf(n) + 1] || 7;
const prevOf = n => ORDER[ORDER.indexOf(n) - 1] || 1;
```

Progress shows `posOf(n)` of 6. Every `render(k)` in a step handler becomes
`render(nextOf(id))`. Back is `render(prevOf(step))`. A saved draft's step id
still resolves.

## Estimate bar

`#footEst` above the footer buttons. `updateEst()` runs from `saveMaybe()`
(every field change and every render). Text: "הערכה כ-₪X · לא מחייב". When
guests are outside 20 to 50: "נתאים לכם מחיר בשיחה".

## Date step

`setGoOff` never called on step 2. Footer label "המשך לפרטים". Subtitle
says flexible is fine. A text link "עדיין לא יודעים? אפשר לדלג" goes to the
details step. Menu default when no slot exists is evening; the guests step
lets them flip it.

## Details step

Required: name, and phone or email. `validate` is
`name && (phone || email)`. Consent stays a checkbox, never blocks. Address
removed from the form, still in the payload as empty. "מעדיפים לדבר קודם?"
is a text link to `openTalk(6)`. Receipt header "הערכת מחיר", total row
"הערכה", one line under it: not binding, the offer arrives after a short
call.

## Submit

`submitLead()` returns a promise resolving to `ok`. Fetch with `keepalive`
and a 15 s abort. Button reads "שולחים..." while pending. On `ok`: pixels,
`render(7)`, postMessage `confirmed`. Otherwise the footer alert shows
"השליחה נכשלה, נסו שוב או בוואטסאפ" and the WhatsApp pill stays.

## Soft leads

- Exit overlay after a plan is picked: one phone field, "שלחו לי את ההערכה
  בוואטסאפ". Posts `leadType: 'incomplete'` with a note naming the path,
  then exits.
- Details step: on input, once name and a contact exist, debounce 2.5 s and
  post `leadType: 'incomplete'` once. Store the returned item id. A completed
  request then posts `mode: 'clearDraft'` with that id, which deletes it.

## Worker

`GRP_ESTIMATE` = the new "Estimate Requested" group. Package leads route
there. `GRP_IN_AGREEMENT` stays defined for the availability feed's held
groups. Pages function in parity.

## Page

All `.js-book` open the builder: with `data-plan` preselected, without it on
step 1. `openV2` no longer takes a gate flag. Menu tab list gets a click
handler that swaps `aria-selected` and re-renders the grid from
`EzraEngine.MENUS`.

## Clarity

`ce_open`, `ce_step_<id>`, `ce_submit`, `ce_success`, `ce_fail`,
`ce_exit_capture`, `ce_soft_autosave`. Sent through the parent's Clarity
instance when the iframe has none.
