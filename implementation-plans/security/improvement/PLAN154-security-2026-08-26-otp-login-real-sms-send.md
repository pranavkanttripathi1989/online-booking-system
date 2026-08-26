---
id: PLAN154
type: improvement
feature: security
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ114
related: [TP174, TR174]
---

# PLAN154 — Wire OTP-login SMS to the real per-org provider registry

## Backend

**`backend/src/auth/auth.service.ts`**:

- Inject `NotificationProviderConfigService` into the constructor.
  `NotificationsModule` is `@Global()` and already exports this
  service (added during `REQ109`), so no `AuthModule` import change is
  needed.
- Replace `requestOtp`'s body: after the existing `if (profile)` guard
  and the existing `redis.set(...)` OTP-state write (both unchanged),
  replace the `console.log` line with:
  ```ts
  if (profile.client_org_id) {
    const config = await this.providerConfigService.getActiveConfigForOrg(profile.client_org_id, 'sms');
    if (config) {
      const result = await config.provider.send(config.credentials, phone, `Your MediBook verification code is ${code}. It expires in ${Math.round(OTP_TTL_SECONDS / 60)} minutes.`);
      if (!result.sent) {
        this.logger.warn(`OTP SMS send failed for ${phone}: ${result.error}`);
      }
    }
  }
  ```
  A private `Logger` instance is added to the class (matching
  `LowStockSweepService`/`NotificationTriggerService`'s own
  `new Logger(ClassName.name)` convention) — `AuthService` currently
  has none.
- The Redis OTP-state write happens *before* the send attempt (already
  the existing order) so a real send failure never leaves the caller
  unable to retry — the code is valid regardless of delivery outcome,
  matching how `verifyOtp` already works (it never distinguishes "code
  never arrived" from "code arrived but was mistyped").
- No change to `requestOtp`'s return value or signature — still always
  `{success: true}` in every branch, preserving TC-AUTH-API-011.

## Testing

`auth.service.spec.ts` (existing file — check its current OTP describe
block before adding):
1. Registered phone with an org whose SMS provider is configured —
   `providerConfigService.getActiveConfigForOrg` called with
   `(client_org_id, 'sms')`; `provider.send` called with the phone and
   a message containing the generated code.
2. Registered phone with no SMS provider configured for the org —
   `provider.send` never called; still returns `{success: true}`.
3. Registered phone with no `client_org_id` on the profile (a
   platform-operator-linked or genuinely org-less profile) —
   `getActiveConfigForOrg` never called; still returns
   `{success: true}`.
4. Unregistered phone — unchanged existing behaviour, still
   `{success: true}`, no provider lookup attempted.
5. `provider.send` resolves `{sent: false}` — `requestOtp` still
   returns `{success: true}` (failure never surfaces to the caller).

Live verification: request an OTP for a real seeded account with a
configured SMS provider against the real dev stack if one exists in
this environment; if not (per this session's own established pattern
for provider-dependent slices), log the gap honestly in `TR###` rather
than fabricate a live-provider check.

## Documentation

`REQ114` (this requirement), this document (`PLAN154`), plus
`TP174`/`TR174` and a context bundle.
