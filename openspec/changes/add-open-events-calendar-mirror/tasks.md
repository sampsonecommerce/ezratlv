# Tasks

## 1. Board preparation

- [x] 1.1 Add a `Source Item` text column to Open Events (`5102602771`)
- [x] 1.2 Record its column id in the worker's `OE` map

## 2. Sync

- [x] 2.1 Read committed items from both source boards, reusing the availability
      feed's committed-group rule rather than a second copy of it
- [x] 2.2 Read existing mirrors from Open Events, keyed by `Source Item`
- [x] 2.3 Build the money-free field map, with notes filtered line by line
- [x] 2.4 Create, update and remove to reconcile the two sets
- [x] 2.5 Never touch an item whose `Source Item` is empty
- [x] 2.6 Validate every status label against the live board before writing

## 3. Trigger

- [x] 3.1 `scheduled()` handler on the worker
- [x] 3.2 `[triggers] crons` in `wrangler.toml`, every 15 minutes
- [x] 3.3 On-demand run behind `CALC_SECRET`, returning a counted summary

## 4. Availability

- [x] 4.1 Dedupe `busy` on `date|start|end`

## 5. Verification

- [x] 5.1 Test: a committed source item produces one mirror with the mapped
      fields and no money
- [x] 5.2 Test: a second run over the same input creates nothing new
- [x] 5.3 Test: a source item leaving the committed groups removes its mirror
- [x] 5.4 Test: an item with no `Source Item` survives a sync in every group
- [x] 5.5 Test: a notes blob carrying `₪` lines arrives with them stripped
- [x] 5.6 Gate the tests in `deploy-worker.yml` before the deploy step
- [ ] 5.7 Run once against the live board and read the result back
