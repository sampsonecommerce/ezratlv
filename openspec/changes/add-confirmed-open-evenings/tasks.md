## 1. Worker

- [x] 1.1 `fetchConfirmedOpenEvenings()`: schedule-board events, not cancelled, not past, date/type/hours only
- [x] 1.2 Add `openEvenings` to the availability feed, degraded or not
- [x] 1.3 `worker/test/open-evenings.test.mjs` and its CI step

## 2. Pages

- [x] 2.1 30-day strip: a confirmed open date without a published event renders as open, with the type card
- [x] 2.2 Month grid: same label and click behaviour
- [x] 2.3 Tonight line: a confirmed open evening is open, not "available for a private event"
- [x] 2.4 Same in `english-events.html`

## 3. Verify

- [ ] 3.1 After deploy, 29.9 and 30.9 read as open evenings on ezratlv.com/open-events and stay unbookable in the private calendar
