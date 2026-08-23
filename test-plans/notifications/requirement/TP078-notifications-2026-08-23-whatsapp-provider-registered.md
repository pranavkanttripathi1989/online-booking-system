---
id: TP078
type: requirement
feature: notifications
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ048
related: [PLAN051]
---

# TP078 — Test plan: WhatsApp provider registered

Direct test-plan against an already-proven pattern (provider #5 in an
established one-file-per-provider registry) — suggestion stage skipped per
`CLAUDE.md`'s working loop step 4.

## Unit

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | The provider registry | `listProviders()` called | Returns exactly 5 providers: 4 declaring `channel: 'sms'`, 1 (`gupshup_whatsapp`) declaring `channel: 'whatsapp'` |
| TC-02 | `gupshup_whatsapp`'s declared required fields | `validateCredentials` called with only `apikey` | Flags the missing `WhatsApp Source Number` field by its human label |
| TC-03 | `gupshup_whatsapp`'s declared required fields | `validateCredentials` called with all three (`apikey`, `source`, `app_name`) | Returns `null` (valid) |
| TC-04 | A successful Gupshup WhatsApp API response (`status: 'submitted'`) | `send()` called | `{ sent: true }` |
| TC-05 | A non-ok HTTP response | `send()` called | `{ sent: false, error }` containing the HTTP status — never throws |
| TC-06 | An ok HTTP response but a non-`'submitted'` status in the body | `send()` called | `{ sent: false, error }` — API-level rejection is caught, not just transport-level |
| TC-07 | The underlying `fetch` call rejects (network failure) | `send()` called | `{ sent: false, error }` — never throws into the caller |
| TC-08 | `NotificationProviderConfigService.providers()` | Called | Includes `gupshup_whatsapp` in its id list, confirming the config service's generic pass-through still works with 5 providers |
| TC-09 (regression) | Every pre-existing provider-registry/config-service test | Suite run | Still green — two provider-count assertions updated from 4 to 5, no other pattern changed |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-10 | `npx tsc --noEmit` | No new errors |
| TC-11 | `npx eslint src/notifications` | 0 errors, 0 new warnings |
| TC-12 | `npx jest notifications --maxWorkers=2` | All cases above pass |

## Deliberately not covered

No live send against real Gupshup WhatsApp sandbox credentials — matches
the exact, already-accepted precedent of every other provider in this
registry (`msg91`/`gupshup`/`twilio`/`aws_sns`), none of which have live
credentials to test against either. No encryption-at-rest test written
specifically for this provider — `notification-provider-config.service.ts`
(and its existing encryption tests) are provider-agnostic and were not
modified by this slice, so they already cover it.
