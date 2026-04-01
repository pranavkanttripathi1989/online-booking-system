# Auth — Feature Suggestions (v4 — All Frontend Items Done)

**Derived from:** [auth-test-results.md](../test-result/auth-test-results.md)  
**Test Plan Source:** [auth-test-plan.md](../test-plan/auth-test-plan.md)  
**Original Date:** 2026-03-16 | **v4 Updated:** 2026-03-27  
**Tested by:** Antigravity AI

> **STATUS UPDATE (2026-03-27 v4):** NEW-AUTH-006 (session-expired banner), NEW-AUTH-007 (Caps Lock warning), NEW-AUTH-008 (inline email validation) implemented and build-verified. All possible frontend suggestions are now complete. Remaining items require backend integration.

---

## Implementation Status

| ID | Suggestion | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| SUG-AUTH-001 | Rate limiting — client-side 5-attempt lockout (60s) | 🔴 High | ✅ **DONE** | `failedAttempts` counter + amber warning at 3; lockout banner + disabled button at 5 |
| SUG-AUTH-002 | Two-factor authentication (2FA / TOTP) | 🔴 High | ⏳ Pending | Requires backend |
| SUG-AUTH-003 | Token expiry warning + auto-logout | 🟡 Medium | ✅ **DONE** | `useInactivityLogout` hook: 15 min → 60s snackbar → auto-logout + `/login?reason=session_expired` |
| SUG-AUTH-004 | Password strength meter on Register | 🟡 Medium | ✅ **DONE** | 4-rule checklist + LinearProgress; blocks submit when Weak |
| SUG-AUTH-005 | Email verification on registration | 🔴 High | ⏳ Pending | Requires backend email service |
| SUG-AUTH-006 | "Remember Me" checkbox | 🟡 Medium | ✅ **DONE** | Checked→localStorage, Unchecked→sessionStorage; default checked |
| SUG-AUTH-007 | Social / SSO login (Google, SAML) | 🟢 Low | ⏳ Pending | Enterprise roadmap |
| SUG-AUTH-008 | "Last Login" display in sidebar | 🟢 Low | ✅ **DONE** | `medibook_last_login` in localStorage; sidebar shows "Just now / Xm ago" |
| SUG-AUTH-009 | Forgot password: cooldown + resend | 🟡 Medium | ✅ **DONE** | 60s countdown; Resend button appears after cooldown |
| SUG-AUTH-010 | Register: phone field + T&C required | 🟡 Medium | ✅ **DONE** | Optional phone field + T&C checkbox gates `canSubmit` |
| SUG-AUTH-011 | Demo chip tooltips with role descriptions | 🟢 Low | ✅ **DONE** | All 5 chips have descriptive MUI Tooltip text |
| SUG-AUTH-012 | Richer 403 Forbidden page | 🟡 Medium | ✅ **DONE** | Role chip + attempted path + "Request Access" mailto |
| SUG-AUTH-013 | Forgot password error for unknown email | — | ✅ **DONE** | `knownEmails[]` check with simulated delay |
| SUG-AUTH-014 | Biometric login (WebAuthn / PWA) | 🟢 Low | ⏳ Pending | Long-term PWA roadmap |
| SUG-AUTH-015 | Keyboard accessibility (WCAG 2.1) | 🟡 Medium | ✅ **DONE** | `aria-label` on all inputs + icon buttons; `tabIndex={0}` on eye icons |
| NEW-AUTH-001 | "Last signed in" timestamp in sidebar | 🟢 Low | ✅ **DONE** | Clock icon + relative time in sidebar footer |
| NEW-AUTH-002 | Client-side failed attempt counter | 🟡 Medium | ✅ **DONE** | (X/5 attempts) in error; amber warning at 3; 60s lockout at 5 |
| NEW-AUTH-003 | Email provider quick-link in forgot password | 🟢 Low | ✅ **DONE** | Gmail/Outlook/Yahoo/iCloud links shown for known domains |
| NEW-AUTH-004 | OTP / Passwordless login | 🔴 High | ✅ **DONE** | Toggle link, monospace 6-digit input, auto-submit, mock 123456 |
| NEW-AUTH-005 | Mobile phone-first signup (3-step flow) | 🟡 Medium | ✅ **DONE** | Phone → OTP → Profile → "Mobile Account Ready!" outside parent form |
| **NEW-AUTH-006 (v4)** | Session-expired banner (`?reason=session_expired`) | 🟡 Medium | ✅ **DONE** | `useSearchParams` reads query param; amber Alert shown above logo |
| **NEW-AUTH-007 (v4)** | Caps Lock warning on password field | 🟡 Medium | ✅ **DONE** | `onKeyUp` + `getModifierState('CapsLock')` → amber warning below field |
| **NEW-AUTH-008 (v4)** | Inline email format validation (Sign In) | 🟡 Medium | ✅ **DONE** | `emailTouched` state + regex on blur; red border + helperText |

---

## v4 Implementation Notes

### NEW-AUTH-006 — Session Expired Banner
**File:** `auth/login.jsx` — `Login` component

```jsx
const [searchParams] = useSearchParams()
const sessionExpired = searchParams.get('reason') === 'session_expired'

// Renders above logo:
{sessionExpired && (
  <Alert severity="warning" icon={<WarningAmberRoundedIcon />} onClose={...}>
    Your session expired due to inactivity. Please sign in again.
  </Alert>
)}
```
- `useInactivityLogout` already navigates to `/login?reason=session_expired` on expiry — this closes the loop for the user.
- Dismissable with `onClose`.

### NEW-AUTH-007 — Caps Lock Warning
**File:** `auth/login.jsx` — `SignInTab`

```jsx
const [capsLock, setCapsLock] = useState(false)

// On password TextField:
onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}

// Below the field:
{capsLock && (
  <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
    <WarningAmberRoundedIcon sx={{ fontSize: '0.9rem', color: '#F9AB00' }} />
    <Typography variant="caption" sx={{ color: '#F9AB00', fontWeight: 600 }}>
      Caps Lock is on
    </Typography>
  </Stack>
)}
```
- Surfaces instantly on the first keypress after Caps Lock is enabled.
- Disappears immediately when Caps Lock is turned off.

### NEW-AUTH-008 — Inline Email Validation
**File:** `auth/login.jsx` — `SignInTab`

```jsx
const [emailTouched, setEmailTouched] = useState(false)
const emailInvalid = emailTouched && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// On email TextField:
onChange={(e) => { setEmail(e.target.value); setEmailTouched(true) }}
onBlur={() => setEmailTouched(true)}
error={emailInvalid}
helperText={emailInvalid ? 'Please enter a valid email address' : ''}
```
- No false positives on empty field (not marked as touched until user interacts).
- Clears immediately when typed email becomes valid.

---

## Remaining Backend-Dependent Items

| Priority | Item | Notes |
|----------|------|-------|
| 🔴 High | SUG-AUTH-002 — 2FA / TOTP | Authenticator app integration |
| 🔴 High | SUG-AUTH-005 — Email verification | SendGrid / AWS SES |
| 🔴 High | SUG-AUTH-001 server-side — Real rate limiting | Redis + Express middleware |
| 🟡 Medium | SUG-AUTH-003 backend — JWT real TTL decode | Read exp from JWT payload |
| 🟢 Low | SUG-AUTH-007 — Google / SSO | OAuth 2.0 PKCE flow |
| 🟢 Low | SUG-AUTH-013 — Admin role impersonation | Admin tooling |
| 🟢 Low | SUG-AUTH-014 — Biometric (WebAuthn) | PWA navigator.credentials |
