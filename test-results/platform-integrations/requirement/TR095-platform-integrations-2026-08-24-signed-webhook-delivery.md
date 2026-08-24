---
id: TR095
type: requirement
feature: platform-integrations
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP096
related: [REQ030, PLAN069]
---

# TR095 — Results: signed outbound webhook delivery

Executed 2026-08-24, consolidated verification pass (all 8 slices).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `never returns the raw secret from findAll` |
| TC-02 | pass | `create() stores the encrypted secret, not the raw one, and returns the raw one exactly once` |
| TC-03 | pass | `rejects deactivating a cross-org endpoint` + `rejects reading the delivery log of a cross-org endpoint` |
| TC-04 | pass | `is a no-op when the org has no active endpoint at all` |
| TC-05 | pass | `is a no-op when no endpoint is subscribed to this specific event type` |
| TC-06 | pass | `POSTs a signed payload and logs a succeeded delivery on a 2xx response` |
| TC-07 | pass | `logs a failed delivery, without throwing, when the endpoint is unreachable` |
| TC-08 | pass | `fires an appointment.created webhook event for the booking clinic's org` |
| TC-09 | pass | `fires an appointment.cancelled webhook event, but only on an actual cancel, not a completing transition` |
| TC-10 | pass | `confirms an awaiting_payment appointment and fires appointment.confirmed + payment.succeeded webhooks` (`appointment-payments.service.spec.ts`) |
| TC-11 | pass | New `webhooks`/`webhookEndpoints` domain-case — matrix + tenancy suites both green |
| TC-12 | pass | `npx tsc --noEmit` — clean |
| TC-13 | pass | `npx eslint` — 0 errors |
| TC-14 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-15 | pass | `npm run test:int` — 4/4 suites, 315/315 tests |

## A real finding: `admin`-only gating made this domain's own tenant-isolation check unreachable

Writing `webhooks.service.spec.ts` initially used an `'admin'`-role caller
as the "org A caller" in the cross-org-rejection tests, matching this
domain's original `@Auth('admin', 'super_admin')` gate. Every such test
passed — but for the wrong reason: `common/scoping/tenant-scope.ts`'s
`isPlatformOperator()` treats every `admin`/`super_admin` caller as
platform-wide unconditionally, regardless of their own `client_org_id`, so
`isSameOrg()` was returning `true` before ever comparing the two orgs.
Confirmed by re-running the test suite with an unmodified admin-only
resolver gate and an `'admin'`-role test actor: the "rejects a cross-org
endpoint" assertions passed vacuously (the service was never actually
rejecting anything; the test simply never exercised the rejection branch).
Fixed two ways, together: (1) the resolver's `@Auth()` was widened to
include `'manager'` — this schema's real org-scoped top role, the only way
an org-isolation check on this domain can ever be meaningfully exercised
by its own allowed callers; (2) the unit tests were changed to use a
`'manager'`-role actor for the isolation assertions, with a comment
explaining why `'admin'` would have made them pass for the wrong reason.
The identical finding applied to `api-keys` (see `TR097`) and was caught
by the same review, not independently.

## Live verification

Not performed this pass — see `TR092`'s environment note. Deferred to the
next session; in particular, a real webhook delivery against a live
receiving endpoint (e.g. `webhook.site`) was not exercised — only the
mocked-fetch unit tests confirm the signing/delivery-logging logic.
