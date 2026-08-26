# Tasks

## 1. Remove the invention

- [x] 1.1 `#archive` section, gallery modal, their JS, the two nav links, and 41
      dead CSS rules
- [x] 1.2 `dayThemes` - 7 weekday templates
- [x] 1.3 `eventsConfig` - 5 hero slides carrying real upcoming dates
- [x] 1.4 `staticEvents` - 4 invented evenings, unreachable dead code
- [x] 1.5 `openEventModal` takes objects only, so there is no path back into a
      table of fiction

## 2. Formats

- [x] 2.1 One shared `EZRA_FORMATS`, read by all three renderers
- [x] 2.2 Sunday music, Tuesday chef pop-up; every other weekday claims nothing
- [x] 2.3 Formats carry no act, no hour, no date pill

## 3. Honest states

- [x] 3.1 Hero paints once, on feed or a 1500ms timeout
- [x] 3.2 Three evening states, not two
- [x] 3.3 A free evening reads `פנוי לאירוע פרטי`
- [x] 3.4 One palette across both calendars and the legend

## 4. Signup

- [x] 4.1 The whole format card opens it, keyboard included
- [x] 4.2 Name and phone only
- [x] 4.3 Interest slug rides in `utm_content`

## 5. Verification

- [x] 5.1 Inline JS passes `node --check`; JSON-LD parses; `<div>` balance
      matches baseline
- [x] 5.2 Netlify deploy preview: format nights, free nights, palette, card
      click, captured signup payload
- [ ] 5.3 Confirm on production that the hero paints a published event with no
      format flash - not observable on a preview, where CORS blocks the feed

## 6. Not built

- [ ] 6.1 Past-events gallery driven by the date having passed
