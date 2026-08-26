# Tasks

## 1. Board preparation

- [x] 1.1 Add `הופעה` to Event type on Open Events and Events Form; relabel Moss
      Town on both so the mirror agrees with its source
- [x] 1.2 `Owner` people column on Open Events (`multiple_person_mm6kph0b`)
- [x] 1.3 `Source Item` text column on Events Form (`text_mm6ktd3a`)
- [ ] 1.4 Moshe accepts the guest invite and is shared on Open Events only
- [ ] 1.5 Revoke the duplicate `moses@onestudios.co.il` invite (a typo of
      `Mozes@`); needs the Monday admin UI

## 2. Loop guard

- [x] 2.1 Sync skips any committed source item carrying a non-empty `Source Item`
- [x] 2.2 Regression case in `worker/test/mirror-sync.test.mjs`
- [x] 2.3 Gated in `deploy-worker.yml`

## 3. Automations - not built

- [ ] 3.1 Assign Moshe on Event type `הופעה`
- [ ] 3.2 Assign Moshe on Event type `מסיבת השמעה`
- [ ] 3.3 Promote to Events Form on Proposal Sent, mapping Item ID → Source Item
- [ ] 3.4 Same on Pre Payment
- [ ] 3.5 Same on Closed Deal
- [ ] 3.6 Confirm exactly one Ivchu item is created per promoted event

## 4. Clean up what already fires

- [ ] 4.1 Four of the five duplicate Events Form automations creating
      `🔒 אירוע סגור` on Open Events - `1718685939`, `1718685976`, `1718686347`,
      `1718686467`, `1718686597`, all "status → Closed Deal", all created within
      36 minutes on 2026-08-20. Three fired on one deal on 2026-08-25 and left
      three phantom items. With the mirror sync live, all five are redundant.
