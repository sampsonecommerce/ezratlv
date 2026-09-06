# Tasks

## 1. Wizard (company-events-v2.html, then English in sync)

- [x] 1.1 ORDER helpers, progress by position, back by position
- [x] 1.2 Gate screen removed; boot goes to step 1 or the guests step
- [x] 1.3 Estimate bar in the footer
- [x] 1.4 Date step optional with skip link
- [x] 1.5 Guests outside 20 to 50 allowed, talk path shown
- [x] 1.6 Details step: fields, validation, link instead of ejector, consent optional
- [x] 1.7 Receipt and confirmation copy: estimate, no contract
- [x] 1.8 Awaited submit with retry; talk form the same
- [x] 1.9 Exit capture overlay
- [x] 1.10 Soft lead autosave on details, deleted on completion
- [x] 1.11 Clarity events

## 2. Page (company-events.html, then English in sync)

- [x] 2.1 CTA labels and behaviour
- [x] 2.2 Package card captions and buttons
- [ ] 2.3 Menu tabs: a click handler already exists (company-events.html `renderCmenu`); the 108 dead clicks Clarity counts could not be reproduced locally. Left for a device check.

## 3. Server

- [x] 3.1 "Estimate Requested" group on Company Events
- [x] 3.2 Worker and Pages function route package leads there

## 4. Verify

- [x] 4.1 Syntax check every edited script block
- [x] 4.2 Drive the wizard at 390px: order, estimate bar, skip date, out-of-range guests, submit fail and success, exit capture
- [x] 4.3 Worker test suite passes
- [ ] 4.4 After a week: Clarity funnel ce_open to ce_success
