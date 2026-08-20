---
id: TP004
type: test-plan
feature: auth
created: 2026-03-19
updated: 2026-04-02
status: approved
parent: unknown
related: [TR004, TS004]
---

# Authentication — Test Plan (Updated Post-Implementation)

**Feature area:** `/src/pages/auth/login.jsx`, `/src/context/AuthContext.jsx`, `/src/components/ProtectedRoute/RoleGuard.jsx`, `/src/components/Layout/Sidebar.jsx`, `/src/hooks/useInactivityLogout.js`, `/src/layouts/AppShell.jsx`  
**Routes tested:** `/login`, `/forbidden`, `/dashboard` (sidebar)  
**Personas:** Admin, Manager, Clinician, Receptionist, Patient  
**Updated:** 2026-03-18 Session 2 — Added TC-AUTH-020 to TC-AUTH-024 for NEW-AUTH-001/002/003, SUG-AUTH-003, SUG-AUTH-010.  
**Updated:** 2026-03-19 Session 3 — Added TC-AUTH-025 to TC-AUTH-032 for NEW-AUTH-004 (OTP login) and NEW-AUTH-005 (mobile signup).  
**Updated:** 2026-03-27 v4 — Added TC-AUTH-033 to TC-AUTH-035 for NEW-AUTH-006/007/008. **Total: 35 TCs.**

---

## 1. Sign-In Flow

### TC-AUTH-001 — Valid admin login redirects to /dashboard
**Prompt:**
> Navigate to `http://localhost:3001/login`.
> Assert: 3-tab strip visible (Sign In, Register, Forgot Password). "Sign In" active.
> Assert: "Remember me" checkbox present and checked by default.
> Assert: 5 demo chips visible: Admin, Manager, Clinician, Staff, Patient.
> Click "Admin" demo chip. Assert: email fills with `admin@medibook.dev`, password fills.
> Click Sign In. Assert: redirect to `/dashboard`. Sidebar shows admin nav items. Avatar "A" visible.

**Expected:** Redirect to `/dashboard`. Admin sidebar (Staff, Finances, Analytics). `medibook_last_login` timestamp written to localStorage.

---

### TC-AUTH-002 — Valid patient login redirects to /patient/dashboard
**Prompt:**
> On `/login`, click "Patient" demo chip. Click Sign In.
> Assert: redirect to `/patient/dashboard`. Sidebar shows patient-only items. Staff, Finances, Analytics, Test Results NOT visible.

**Expected:** Patient portal with minimal sidebar. RBAC correct.

---

### TC-AUTH-003 — Invalid credentials show error alert
**Prompt:**
> On `/login`, type `wrong@email.com` and `wrongpass`. Click Sign In.
> Assert: error alert visible — "Invalid email or password. Click a demo account below."
> Assert: user stays on `/login`. Form fields retain entered values.

**Expected:** No redirect. Alert visible inline. No loading spinner stuck.

---

### TC-AUTH-004 — Empty form shows disabled state
**Prompt:**
> On `/login` Sign In tab. Leave both email and password empty.
> Assert: Sign In button is `disabled` (grey, not clickable).
> Type one character in email only. Assert: button still disabled (password still empty).

**Expected:** `disabled={!email || !password}` — button only enables when BOTH fields have content.

---

### TC-AUTH-005 — Password visibility toggle
**Prompt:**
> On `/login`, type text in password field. Click eye icon (right side of password field).
> Assert: password text visible (input type = `text`). Eye icon changes to VisibilityOff.
> Click again. Assert: password hidden. Eye icon reverts.
> Tab to eye icon with keyboard (Tab key). Press Space. Assert: toggles visibility. (SUG-AUTH-015)

**Expected:** Toggle bidirectional. Eye icon has `aria-label="Show password"` / `"Hide password"`. Keyboard accessible.

---

### TC-AUTH-006 — Demo account quick-fill buttons with tooltips
**Prompt:**
> On `/login`, hover over "Admin" demo chip. Wait 300ms.
> Assert: MUI Tooltip appears with text: "Full access to all admin features, staff, finances & analytics" (SUG-AUTH-011).
> Click "Admin" chip. Assert: email and password fill.
> Hover "Patient" chip. Assert: tooltip: "Patient portal: book appointments, view history & messages".
> Verify all 5 chips have unique tooltip text.

**Expected:** All 5 chips fill credentials. All 5 have descriptive role tooltips.

---

### TC-AUTH-007 — Role-based page access (RBAC) — enriched 403 page
**Prompt:**
> Log in as Patient. Navigate directly to `http://localhost:3001/staff`.
> Assert: 403 Forbidden page renders.
> Assert: "Signed in as:" chip shows "patient" (capitalized).
> Assert: message contains: "Your role (patient) does not have access to /staff."
> Assert: Two buttons: "Go Back" (red outline) and "Request Access" (blue outline).
> Click "Request Access". Assert: system email client opens with pre-filled subject and body.

**Expected:** `RoleGuard` blocks. `useLocation().pathname` = "/staff" shown. `useAuth().user.roles` = [{name:"patient"}] shown. (SUG-AUTH-012)

---

### TC-AUTH-008 — Already logged-in user visiting /login is redirected
**Prompt:**
> Log in as Admin. Navigate to `http://localhost:3001/login`.
> Assert: immediately redirected to `/dashboard`. Login page not rendered.

**Expected:** `isAuthenticated=true` → `<Navigate to="/dashboard" replace />` fires. No flash.

---

### TC-AUTH-009 — Logout clears session
**Prompt:**
> Log in as Admin. Click avatar top-right → user menu → "Sign Out".
> Assert: redirect to `/login`. Sidebar disappears.
> Navigate to `/dashboard`. Assert: redirect back to `/login`.

**Expected:** `AuthContext.logout()` removes `medibook_token`, `medibook_user` from both localStorage AND sessionStorage. `ProtectedRoute` blocks.

---

## 2. Registration Tab

### TC-AUTH-010 — Register form submission blocked without content
**Prompt:**
> Click "Register" tab. Leave all fields empty.
> Assert: "Create Account" button is `disabled`.
> Fill First Name and Email but add a "weak" password (e.g., "abc").
> Assert: button still disabled. Error text: "Password is too weak — see requirements below".

**Expected:** `canSubmit = firstName && email && password && !isWeak`. Weak password blocks submit.

---

### TC-AUTH-011 — Successful registration with strong password
**Prompt:**
> Register tab: First Name "Test", Last Name "User", email `test@new.com`, password `TestPass1!`, Role "Patient".
> Watch password strength meter: all 4 rules should turn green. "Strength: Strong" in green.
> Click "Create Account". Wait 1.5s.
> Assert: "Account Created!" screen with ✅ icon and "Check your email for a confirmation link."

**Expected:** Password strength meter shows "Strong". Submit allowed. Success state shown.

---

## 3. Forgot Password

### TC-AUTH-012 — Forgot password sends reset email (known address)
**Prompt:**
> Click "Forgot Password" tab. Enter `admin@medibook.dev`. Click "Send Reset Link".
> Wait 1.2s (loading state).
> Assert: "Check your inbox" success state. Address shown: "A reset link has been sent to admin@medibook.dev".
> Assert: countdown shown: "Didn't receive it? Resend in 58s" (or similar).
> Wait 60s (or note the countdown behaviour). Assert: "Resend Email" button appears.

**Expected:** Success state + 60-second countdown (SUG-AUTH-009). Resend only available after cooldown.

---

### TC-AUTH-013 — Forgot password with unknown email (fixed)
**Prompt:**
> Forgot Password tab. Enter `nonexistent@example.com`. Click "Send Reset Link".
> Wait 1.2s.
> Assert: red error Alert appears: `No account found for "nonexistent@example.com". Check the address or register.`
> Assert: user stays on Forgot Password tab. Email field retains value.

**Expected:** Error state shown. No `setSent(true)` called. No countdown started. (TC-AUTH-013 fix)

---

## 4. Session Persistence

### TC-AUTH-014 — Page refresh keeps user logged in
**Prompt:**
> Log in as Manager. Navigate to `/appointments`. Refresh browser (F5).
> Assert: still on `/appointments`. Not redirected to `/login`. Manager sidebar visible.

**Expected:** Token in localStorage/sessionStorage. `getInitialState()` reads synchronously. Auth state rehydrated before first render.

---

## 5. New Test Cases (Post-Suggestion Implementation)

### TC-AUTH-015 — Remember Me checkbox (SUG-AUTH-006)
**Prompt:**
> On `/login` Sign In tab, verify "Remember me" checkbox is present and checked by default.
> Observe: checkbox is left of "Forgot password?" link. Tooltip: "Uncheck on shared/public devices".
> Log in with Remember Me ✅ checked. Navigate away. Come back to `/login`.
> Assert: redirected to `/dashboard` (token still in localStorage).

**Expected:** Default checked. Token written to `localStorage`. Persistent between page visits.

---

### TC-AUTH-016 — Remember Me unchecked → sessionStorage only (SUG-AUTH-006)
**Prompt:**
> On `/login`, **uncheck** "Remember me". Log in via any demo chip.
> Assert: login succeeds. Navigate the app normally.
> Check DevTools → Application → localStorage. Assert: `medibook_token` NOT present in localStorage.
> Check sessionStorage. Assert: `medibook_token` IS present.

**Expected:** When unchecked, `AuthContext.login(token, user, false)` → sessionStorage only. localStorage explicitly cleared.

---

### TC-AUTH-017 — Password strength meter (SUG-AUTH-004)
**Prompt:**
> Register tab. Type "weak" in password field.
> Assert: LinearProgress bar appears (near 0%). All 4 checklist items ○ (unchecked).
> Assert: "Strength: Weak" label in red (#D93025). Submit button grey/disabled.
> Change password to "TestPass1!".
> Assert: all 4 items turn ✅ green. "Strength: Strong" in green. Progress bar fills. Submit enabled.

**Expected:** Real-time strength meter. 4 rules evaluated on every keystroke. Submission blocked when Weak.

---

### TC-AUTH-018 — Demo chip tooltips (SUG-AUTH-011)
**Prompt:**
> On `/login` Sign In tab, hover over "Manager" demo chip for 300ms.
> Assert: tooltip text: "Manages clinicians, schedules and availability for an organisation".
> Hover "Clinician". Assert: "Clinician portal: calendar, patients, availability & consultations".
> Hover "Staff". Assert: "Reception / staff dashboard: appointments & patient check-ins".

**Expected:** All 5 chips have unique, descriptive tooltips. MUI `<Tooltip placement="top" arrow>` renders above each chip.

---

### TC-AUTH-019 — Richer 403 page elements (SUG-AUTH-012)
**Prompt:**
> Log in as any non-admin role. Navigate to `/staff` (patient) or `/finances` (clinician).
> Assert:
>   - 403 gradient text visible
>   - "Signed in as:" + role chip (e.g., "patient")
>   - Body message: "Your role (patient) does not have access to /staff."
>   - "Go Back" button (red outline) visible
>   - "Request Access" button (blue outline) visible
> Click "Request Access". Assert: mailto link opens with subject "Access Request: /staff".

**Expected:** `useLocation().pathname` and `useAuth().user.roles` both used to personalise the error message. (SUG-AUTH-012)

---

## 8. Session-2 New Implementations (2026-03-18)

### TC-AUTH-020 — Register: Phone Field Visible (SUG-AUTH-010)
**Steps:** Open `/login` → Register tab. Check form for phone field.  
**Expected:** "Phone Number (optional)" field with phone icon + helper text "For appointment reminders and 2FA (optional)".

---

### TC-AUTH-021 — Register: T&C Checkbox Required for Submit (SUG-AUTH-010)
**Steps:** Fill First Name, Email, strong password (no T&C). Observe button. Then check T&C.  
**Expected:** Button disabled until T&C checked. Label shows "Terms of Service" + "Privacy Policy" teal links.

---

### TC-AUTH-022 — Sign In: Failed Attempt Counter + Warning + Lockout (NEW-AUTH-002)
**Steps:** Enter bad credentials 3–5 times repeatedly via Sign In.  
**Expected:**
- Each fail shows `(X/5 attempts)` in error message
- After 3 fails: amber alert "3/5 failed attempts. Account will lock after 5."
- After 5 fails: form locked 60s, button shows "Locked — wait 60s"

---

### TC-AUTH-023 — Forgot Password: Email Provider Quick-Link (NEW-AUTH-003)
**Steps:** Forgot Password tab → enter "test@gmail.com" → Send Reset Link → success state.  
**Expected:** "Open Gmail →" outlined button visible. No link shown for unknown domains.

---

### TC-AUTH-024 — Sidebar: Last Signed In Timestamp (NEW-AUTH-001)
**Steps:** Login as any demo account → check sidebar footer.  
**Expected:** Clock icon + "Just now" (or "Xm ago") text below the role chip.

---

## 8. OTP / Passwordless Login (NEW-AUTH-004) — Session 3

### TC-AUTH-025 — OTP link visible on Sign In tab
**Steps:** Go to /login → Sign In tab → scroll to bottom.  
**Expected:** "Sign in with OTP instead →" link visible below Sign In button.

### TC-AUTH-026 — OTP mode toggle
**Steps:** Click "Sign in with OTP instead →" link.  
**Expected:** Form switches to show: "← Back to password" link, "Passwordless" chip, body text, "Email or Phone Number" field, "Send One-Time Code" button.

### TC-AUTH-027 — OTP input field visible after sending code
**Steps:** OTP mode → enter "admin@medibook.dev" → click "Send One-Time Code" → wait 2s.  
**Expected:** A single wide OTP TextField with `••••••` placeholder or monospace digit display shown between demo hint and Verify button.

### TC-AUTH-028 — OTP 123456 logs in demo account
**Steps:** OTP verify step → type "123456" in OTP field.  
**Expected:** Auto-submits on 6th digit → redirects to /dashboard as Admin.

### TC-AUTH-029 — Wrong OTP shows error
**Steps:** OTP verify step → type "000000" → click "Verify & Sign In".  
**Expected:** Error: "Incorrect OTP. In demo mode use 123456."

### TC-AUTH-030 — 60s resend countdown
**Steps:** OTP verify step → observe countdown below Verify button.  
**Expected:** "Resend code in Xs" countdown visible, decrements each second.

---

## 9. Mobile Signup — Phone-First Registration (NEW-AUTH-005) — Session 3

### TC-AUTH-031 — "Sign up with mobile" button in Register tab
**Steps:** Register tab → scroll to bottom of form.  
**Expected:** "─── or ───" divider + phone icon + "Sign up with mobile number" teal outlined button.

### TC-AUTH-032 — Full mobile signup flow: phone → OTP → profile → success
**Steps:** Click mobile button → enter phone → Send → OTP 123456 → name → Create Account.  
**Expected:**
- Step 1: 3-step progress tracker + phone field + "Send Verification Code" button
- Step 2: OTP input + "Resend in Xs" + "Verify Number" button
- Step 3: "Your Name" field + role selector + "Create Mobile Account" button
- Success: "Mobile Account Ready!" with entered phone number displayed

---

## 10. v4 New Test Cases (NEW-AUTH-006, NEW-AUTH-007, NEW-AUTH-008)

### TC-AUTH-033 — Session expired banner (NEW-AUTH-006)
**Steps:** Navigate to `http://localhost:3001/login?reason=session_expired` (directly, or triggered by inactivity logout).  
**Expected:**
- Amber warning alert is visible above the HealthSync logo: "Your session expired due to inactivity. Please sign in again."
- Alert has a × dismiss button (`onClose` prop).
- If user logs in normally (not expired), no banner appears.

---

### TC-AUTH-034 — Caps Lock warning on password field (NEW-AUTH-007)
**Steps:** On `/login` Sign In tab — enable Caps Lock on keyboard. Click into the password field. Type any character.  
**Expected:**
- A yellow/amber row appears immediately below the password field: ⚠ **"Caps Lock is on"**
- Turn Caps Lock OFF, type again.
- **Expected:** warning disappears immediately.

**Note:** If testing via browser automation that cannot control Caps Lock state, verify by code inspection (`onKeyUp` + `getModifierState('CapsLock')` pattern).

---

### TC-AUTH-035 — Inline email format validation (NEW-AUTH-008)
**Steps:**
> On `/login` Sign In tab, click the email field. Type "notanemail" (no @). Click somewhere else (blur).
> Assert: email field turns red. Helper text shows: "Please enter a valid email address".
> Clear and type a valid email `admin@medibook.dev`.  
> Assert: red border clears. No helper text.

**Expected:** Validation triggers on `onBlur` and on `onChange` after first touch. Empty field shows no error. Valid email clears error immediately.

**Edge case:** Partially valid emails like "a@b" should still fail. Only `user@domain.tld` patterns pass.
