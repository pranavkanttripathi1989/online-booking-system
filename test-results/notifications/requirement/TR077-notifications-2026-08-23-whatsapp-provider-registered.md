---
id: TR077
type: requirement
feature: notifications
created: 2026-08-23
updated: 2026-08-23
status: pass
parent: TP078
related: [REQ048, PLAN051]
---

# TR077 — Results: WhatsApp provider registered

Executed 2026-08-23 in the same isolated worktree as `TR074`-`TR076`.

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `lists all 5 registered providers -- 4 sms, 1 whatsapp (REQ025)` |
| TC-02 | pass | `validateCredentials(gupshupWhatsappProvider, { apikey: 'k' })` contains "WhatsApp Source Number" |
| TC-03 | pass | Same test, full credential set returns `null` |
| TC-04 | pass | `gupshup_whatsapp reports success when Gupshup accepts the message` |
| TC-05 | pass | `gupshup_whatsapp reports a non-ok HTTP response as a failed (not thrown) send` |
| TC-06 | pass | `gupshup_whatsapp treats a non-"submitted" status body as a failed send, not just a non-ok status` |
| TC-07 | pass | `gupshup_whatsapp never throws when the underlying request rejects (e.g. network failure)` |
| TC-08 | pass | `notification-provider-config.service.spec.ts`'s `providers` case, updated id list includes `gupshup_whatsapp` |
| TC-09 | pass | Full suite: Test Suites: 5 passed, Tests: 51 passed, 51 total (all `notifications`-module specs) |
| TC-10 | pass | `npx tsc --noEmit` — 0 new errors (2 pre-existing unrelated errors remain, same as every other slice this session) |
| TC-11 | pass | `npx eslint src/notifications` — 0 errors, 0 warnings |
| TC-12 | pass | Covered by TC-09 |

## Notes

Confirms the phase-planning guidance's own claim ("zero dependencies, the
provider registry already exists") held up exactly against the real code —
this slice touched zero schema, zero resolver, zero entity files. The
`channel` field's type widening in `provider.interface.ts` was the only
non-additive change in the whole slice.
