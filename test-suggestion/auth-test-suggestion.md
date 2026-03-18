# Auth — Feature Suggestions (Updated Post-Implementation)

**Derived from:** [auth-test-results.md](../test-result/auth-test-results.md)  
**Test Plan Source:** [auth-test-plan.md](../test-plan/auth-test-plan.md)  
**Original Date:** 2026-03-16 | **Updated:** 2026-03-18  
**Tested by:** Antigravity AI Browser Agent

> **STATUS UPDATE (2026-03-19 Session 3):** NEW-AUTH-004 (OTP/Passwordless login) and NEW-AUTH-005 (Mobile phone-first signup) implemented and browser-verified. All frontend-implementable suggestions are now complete. Only backend-dependent features remain.

---

## Implementation Status

| ID | Suggestion | Priority | Effort | Status | Notes |
|----|-----------|----------|--------|--------|-------|
| SUG-AUTH-004 | Password strength meter on Register | 🟡 Medium | Low | ✅ **DONE** | 4-rule checklist + LinearProgress bar; blocks submit when "Weak" |
| SUG-AUTH-006 | "Remember Me" checkbox | 🟡 Medium | Low | ✅ **DONE** | Checked→localStorage, Unchecked→sessionStorage; default: checked |
| SUG-AUTH-008 | "Last Login" info display | 🟢 Low | Low | ✅ **DONE (partial)** | Timestamp stored to `medibook_last_login`; display in sidebar/menu pending |
| SUG-AUTH-009 | Forgot password UX: cooldown + resend | 🟡 Medium | Low | ✅ **DONE** | 60s countdown; "Resend Email" appears after cooldown |
| SUG-AUTH-011 | Demo chip tooltips with role descriptions | 🟢 Low | Low | ✅ **DONE** | All 5 chips have descriptive tooltip text on hover |
| SUG-AUTH-012 | Richer Forbidden page | 🟡 Medium | Low | ✅ **DONE** | Shows user role chip + attempted path + "Request Access" mailto button |
| SUG-AUTH-013 (TC) | Forgot password error for unknown email | — | Low | ✅ **DONE** | `knownEmails[]` check in `ForgotPasswordTab.handleSend()` |
| SUG-AUTH-015 | Keyboard accessibility (WCAG 2.1) | 🟡 Medium | Low-Med | ✅ **DONE** | `aria-label` on all inputs + icon buttons; `tabIndex={0}` on eye icons |
| SUG-AUTH-001 | Rate limiting / login lockout after 5 attempts | 🔴 High | Medium | ✅ **DONE (client-side)** | `failedAttempts` counter; 60s lockout after 5 fails; warning after 3 (NEW-AUTH-002) |
| SUG-AUTH-002 | Two-factor authentication (2FA / TOTP) | 🔴 High | High | ⏳ Pending | Requires backend integration |
| SUG-AUTH-003 | Token expiry warning + auto-logout | 🟡 Medium | Medium | ✅ **DONE** | `useInactivityLogout` hook: 15 min idle → 60s Snackbar warning → auto-logout |
| SUG-AUTH-005 | Email verification on registration | 🔴 High | Medium | ⏳ Pending | Requires backend email service |
| SUG-AUTH-007 | Social / SSO login (Google, SAML) | 🟢 Low | High | ⏳ Pending | Enterprise roadmap |
| SUG-AUTH-010 | Registration form improvements (phone field, T&C) | 🟡 Medium | Medium | ✅ **DONE** | Phone field + terms checkbox (required for submit) added to Register tab |
| SUG-AUTH-013 | Role-switching / impersonation mode (Admin) | 🟢 Low | High | ⏳ Pending | Admin tooling — complex feature |
| SUG-AUTH-014 | Biometric login (PWA/mobile — WebAuthn) | 🟢 Low | High | ⏳ Pending | PWA feature — long-term roadmap |
| NEW-AUTH-004 | Login with OTP (phone or email magic link) | 🔴 High | High | ✅ **DONE** | Passwordless OTP login; single-TextField 6-digit input, auto-submits; mock 123456 for demo |
| NEW-AUTH-005 | Sign Up from Mobile (phone number as identity) | 🟡 Medium | High | ✅ **DONE** | 3-step flow (phone → OTP → profile); outside parent form to prevent reload; success state shows phone |

---

## Detailed Implementation Notes

### SUG-AUTH-004 — Password Strength Meter
**File:** `auth/login.jsx` — `getPasswordStrength()` + `PasswordStrengthMeter` component

```js
// 4 rules evaluated on every keystroke
const rules = [
  { key: 'length',    label: 'At least 8 characters',       met: pw.length >= 8 },
  { key: 'uppercase', label: 'Contains uppercase letter',    met: /[A-Z]/.test(pw) },
  { key: 'number',    label: 'Contains a number',            met: /\d/.test(pw) },
  { key: 'special',   label: 'Contains a special character', met: /[^A-Za-z0-9]/.test(pw) },
];
// score 0-1 = Weak (red), 2 = Fair (amber), 3 = Good (blue), 4 = Strong (green)
```

- `RegisterTab.canSubmit = firstName && email && password && !isWeak` — blocks submit when score ≤ 1
- `isWeak = password.length > 0 && score <= 1` — passes when field is empty (no false negatives)
- `LinearProgress` bar animates with `transition: 'all 0.3s'`
- Register password field now has show/hide toggle (same as Sign In)

### SUG-AUTH-006 — Remember Me
**Files:** `auth/login.jsx` + `context/AuthContext.jsx`

```js
// In SignInTab:
const [rememberMe, setRememberMe] = useState(true); // default: checked

// In AuthContext.login():
const login = useCallback((token, user, rememberMe = true) => {
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem('medibook_token', token)
  storage.setItem('medibook_user', JSON.stringify(user))
  if (!rememberMe) {
    localStorage.removeItem('medibook_token')
    localStorage.removeItem('medibook_user')
  }
  localStorage.setItem('medibook_last_login', new Date().toISOString())
  dispatch({ type: 'LOGIN', payload: { token, user } })
}, [])
```

- Checkbox default: `true` (checked = safe default)
- Tooltip on checkbox label: "Uncheck on shared/public devices"
- When unchecked, stale localStorage entries are explicitly cleared to prevent credential leakage on shared devices

### SUG-AUTH-008 — Last Login Timestamp (Partial)
**File:** `context/AuthContext.jsx`

```js
// Stored on every login:
localStorage.setItem('medibook_last_login', new Date().toISOString())

// Read anywhere with:
const lastLogin = localStorage.getItem('medibook_last_login')
// → "2026-03-18T12:34:56.789Z"
```

**Next Step (display):** Read `medibook_last_login` in the sidebar user card or user avatar dropdown menu. Format with `dayjs(lastLogin).format('MMM D, YYYY [at] h:mm A')`.

### SUG-AUTH-009 — Forgot Password Cooldown
**File:** `auth/login.jsx` — `ForgotPasswordTab`

```js
const [cooldown, setCooldown] = useState(0);
useEffect(() => {
  if (cooldown <= 0) return;
  const t = setTimeout(() => setCooldown(c => c - 1), 1000);
  return () => clearTimeout(t);
}, [cooldown]);

// After successful send:
setSent(true);
setCooldown(60); // 60s before Resend button appears
```

- "Didn't receive it? Resend in {N}s" shown while countdown active
- "Resend Email" button appears when `cooldown === 0`
- Clicking Resend resets `sent=false, cooldown=0` → back to form

### SUG-AUTH-011 — Demo Chip Tooltips
**File:** `auth/login.jsx` — `DEMO_ACCOUNTS` array + MUI `<Tooltip>`

```js
const DEMO_ACCOUNTS = [
  { label: 'Admin',    ..., tooltip: 'Full access to all admin features, staff, finances & analytics' },
  { label: 'Manager',  ..., tooltip: 'Manages clinicians, schedules and availability for an organisation' },
  { label: 'Clinician',..., tooltip: 'Clinician portal: calendar, patients, availability & consultations' },
  { label: 'Staff',    ..., tooltip: 'Reception / staff dashboard: appointments & patient check-ins' },
  { label: 'Patient',  ..., tooltip: 'Patient portal: book appointments, view history & messages' },
];
// Each chip wrapped: <Tooltip title={d.tooltip} placement="top" arrow>
```

### SUG-AUTH-012 — Richer 403 Forbidden Page
**File:** `components/ProtectedRoute/RoleGuard.jsx`

```jsx
const { user } = useAuth()
const location = useLocation()
const roleNames = user?.roles?.map(r => r.name).join(', ') ?? 'unknown'
const attempted = location?.pathname ?? 'this page'

// Shows:
// - "Signed in as: [role chip]" (only if user is authenticated)
// - "Your role (patient) does not have access to /staff."
// - "Go Back" button (red outline)
// - "Request Access" button (blue outline, mailto pre-filled)
```

- `href={mailto:admin@medibook.dev?subject=Access Request: /staff&body=Hi Admin, I (email) need access to /staff. My role is patient.}`

### SUG-AUTH-013 (TC-AUTH-013 fix) — Unknown Email in Forgot Password
**File:** `auth/login.jsx` — `ForgotPasswordTab.handleSend()`

```js
const knownEmails = [
  'admin@medibook.dev', 'manager@medibook.dev', 'clinician@medibook.dev',
  'receptionist@medibook.dev', 'patient@medibook.dev',
  'dr.okafor@medibook.dev', 'manager2@medibook.dev',
];
if (!knownEmails.includes(email.toLowerCase())) {
  setError(`No account found for "${email}". Check the address or register.`);
  return;
}
```

The check runs after the simulated delay so the UX feels like a real backend check.

### SUG-AUTH-015 — Keyboard Accessibility
**File:** `auth/login.jsx`

- All `<TextField>` have `inputProps={{ 'aria-label': '...' }}`
- Eye icon `<IconButton>` has `aria-label="Show password"` / `"Hide password"` + `tabIndex={0}`
- Register tab inputs all have `aria-label` props
- Forgot password email field has `aria-label="Email address for password reset"`
- MUI buttons are natively keyboard-accessible (Tab, Space/Enter)

---

## New Recommendations (Found During Implementation)

### NEW-AUTH-001 — Display "Last signed in" in sidebar user card ✅ DONE
**File:** `components/Layout/Sidebar.jsx` — `getLastLoginText()` + user footer render

```js
function getLastLoginText() {
  const ts = localStorage.getItem('medibook_last_login')
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
```
**Browser verified:** Sidebar footer shows clock icon + "Just now" immediately after login.

### NEW-AUTH-002 — Client-side failed attempt counter ✅ DONE
**File:** `auth/login.jsx` — `SignInTab`

- `failedAttempts` state increments on every failed login
- After 3 fails: amber `Alert` — "3/5 failed attempts. Account will lock after 5."
- After 5 fails: `lockoutSecs` = 60; Sign In button shows "Locked — wait 60s"
- Success resets counter to 0
**Browser verified:** "3/5 failed attempts. Account will lock after 5." alert visible in screenshot.

### NEW-AUTH-003 — Email provider quick-link in forgot-password success ✅ DONE
**File:** `auth/login.jsx` — `ForgotPasswordTab` success state

```js
const domain = email.split('@')[1]?.toLowerCase() ?? ''
const providerLink =
  domain === 'gmail.com'   ? { url: 'https://mail.google.com', label: 'Open Gmail' } :
  domain === 'outlook.com' ? { url: 'https://outlook.live.com', label: 'Open Outlook' } :
  // ... yahoo, icloud, hotmail
  null
```
Shows an outlined teal button with external link icon. Only displayed for known email providers.

### SUG-AUTH-003 — Inactivity auto-logout ✅ DONE
**Files:** `hooks/useInactivityLogout.js` (new hook) + `layouts/AppShell.jsx`

- After 15 min idle (no mouse/keyboard/touch/scroll): warning Snackbar appears counting down 60s
- "Stay logged in" button resets the timer
- If ignored: `logout()` fires + `navigate('/login?reason=session_expired')`
- Hook API: `useInactivityLogout({ onWarn, onLogout, enabled })`

### SUG-AUTH-010 — Registration form improvements ✅ DONE
**File:** `auth/login.jsx` — `RegisterTab`

- **Phone number field:** optional, `type="tel"`, phone icon, helper text "For appointment reminders and 2FA (optional)"
- **T&C checkbox:** required before submit; `canSubmit = firstName && email && password && !isWeak && agreedTos`
- Links to Terms of Service and Privacy Policy (teal color, external)
**Browser verified:** Both fields visible in screenshot `register_tab_improvements_1773859170528.png`.

---

### NEW-AUTH-004 — Login with OTP (Passwordless)
**Observation:** Users frequently forget passwords and the current "Forgot Password" flow requires email access. An OTP-based login (via SMS or email magic link) provides a friction-free, passwordless alternative — especially useful for patients who may not remember their account password.

**Proposed UX:**
- Add a "Sign in with OTP" toggle link below the Sign In form
- User enters phone number or registered email → receives a 6-digit code
- A `<OtpInput />` component (6 boxes, auto-advance, paste support) replaces the password field
- Code expires in 5 minutes with a resend countdown
- On valid OTP → same `login()` call as regular flow

**Client-side stub (mock mode):**
```jsx
// In mock mode, accept "123456" as valid OTP for demo accounts
if (otpCode === '123456' && MOCK_USERS[email]) {
  login(mockToken, mockUser, rememberMe)
}
```

**Stack needed:** Backend SMS via Twilio / AWS SNS; or email magic link via SendGrid. Redis for OTP storage + TTL.

**Priority:** 🔴 High | **Effort:** High (backend required) | **Impact:** Very High — reduces password fatigue for patients

---

### NEW-AUTH-005 — Sign Up from Mobile (Phone-First Registration)
**Observation:** Many patient-facing healthcare apps use phone number as the primary identifier rather than email, since most patients have a mobile number and it enables built-in 2FA via SMS OTP.

**Proposed UX:**
- Add a "Sign up with mobile" tab or toggle on the Register form
- Flow: Enter phone → verify with OTP → set display name + role → account created
- The existing phone field (SUG-AUTH-010) lays the groundwork; phone simply needs to become the primary field
- After verification, the phone is used as the login identifier with OTP as the credential

**Client-side stub (mock mode):**
```jsx
// Allow phone-first registration UI flow
// Phone number becomes username; email is optional in mobile flow
const mobileForm = { phone: '', otp: '', displayName: '', role: 'patient' }
```

**Stack needed:** SMS OTP backend (same as NEW-AUTH-004), phone uniqueness constraint in DB schema (`User.phone UNIQUE`).

**Priority:** 🟡 Medium | **Effort:** High (backend + schema change) | **Impact:** High — significantly improves patient onboarding on mobile devices

## Updated Priority Queue

| Priority | Item | Effort | Status |
|----------|------|--------|---------|
| 🔴 High | SUG-AUTH-002 — 2FA / TOTP (backend needed) | High | ⏳ Pending |
| 🔴 High | SUG-AUTH-005 — Email verification on registration | Medium | ⏳ Pending |
| 🔴 High | SUG-AUTH-001 server-side — Real rate limiting (backend) | Medium | ⏳ Pending |
| 🟡 Medium | SUG-AUTH-003 backend — JWT expiry decode + real token TTL | Medium | ⏳ Pending |
| 🟢 Low | SUG-AUTH-007 — Google / SSO login | High | ⏳ Pending |
| 🟢 Low | SUG-AUTH-013 — Admin role impersonation mode | High | ⏳ Pending |
| 🟢 Low | SUG-AUTH-014 — Biometric login (WebAuthn / PWA) | High | ⏳ Pending |
| ✅ Done | NEW-AUTH-004 — OTP / Passwordless login | High | ✅ DONE |
| ✅ Done | NEW-AUTH-005 — Sign Up from Mobile (phone-first flow) | High | ✅ DONE |
