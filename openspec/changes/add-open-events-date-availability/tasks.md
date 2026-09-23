# Tasks

## 1. Worker

- [x] 1.1 Move the slot loop out of `availability()` into `collectBusy()` / `itemSlots()`; feed output unchanged
- [x] 1.2 `syncDateAvailability()` on the cron and on `?sync=1`
- [x] 1.3 "not closed" groups are never committed
- [x] 1.4 Allow-list for `?eventImage=`, checked before the cache
- [x] 1.5 `BUILD_ID` 2026-09-23b

## 2. Tests

- [x] 2.1 `date-availability.test.mjs`: overlap across midnight, private over open, idempotent, `לא נבדק` on a failed read, "not closed" groups
- [x] 2.2 `image-proxy.test.mjs`: published and approved served, everything else 404 before a URL lookup
- [x] 2.3 Both added as gates in `deploy-worker.yml`; every existing test still passes

## 3. Ship

- [ ] 3.1 PR reviewed and merged by Yeheli
- [ ] 3.2 Live `build` reads `2026-09-23b`; `זמינות תאריך` filled on open leads within 15 minutes; past-events images still load

## 4. Follow-up: placeholders give way (2026-09-23)

- [x] 4.1 `readBusy()` shared by `syncDateAvailability()` and `yieldPlaceholders()` through `availabilityPasses()`
- [x] 4.2 `yieldPlaceholders()`: cancel overtaken placeholders, one update, no customer names
- [x] 4.3 `placeholder-yield.test.mjs` as a CI gate; `BUILD_ID` 2026-09-23c
- [ ] 4.4 Merged; live `build` reads `2026-09-23c`
