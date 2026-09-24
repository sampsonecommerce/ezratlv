## 1. Worker

- [x] 1.1 `mondayHook()`: key check, challenge echo, availability passes in `waitUntil`
- [x] 1.2 Judge committed leads that still read `לא נבדק`, once
- [x] 1.3 Skip a lead's own promoted copy; a promoted open event is not a private slot
- [x] 1.4 Tests: `availability-webhook.test.mjs`, `date-availability.test.mjs` updated, CI step

## 2. Deploy

- [ ] 2.1 `wrangler secret put MONDAY_WEBHOOK_KEY`
- [ ] 2.2 Register the webhooks in design.md and confirm each one answered the challenge
- [ ] 2.3 Edit the three Open Events automations in design.md
- [ ] 2.4 Test: new lead, close within a minute, schedule item appears
