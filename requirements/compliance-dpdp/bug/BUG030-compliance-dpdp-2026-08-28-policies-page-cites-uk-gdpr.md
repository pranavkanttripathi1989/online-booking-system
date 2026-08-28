---
id: BUG030
type: bug
feature: compliance-dpdp
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG030 — GDPR (not DPDP) referenced in the admin Policies tab and the public login page

## Source

Found live during a Chrome-DevTools-driven admin-role QA sweep. This
product is built for the Indian market throughout (CLAUDE.md's own
"India-specific decisions" section: Razorpay, MSG91/Gupshup, GST, INR)
and already has a real, shipped `compliance-dpdp` feature covering
India's Digital Personal Data Protection Act 2023 (`RightsRequests`,
`Consents`, `RetentionPolicies` — `REQ034`/`REQ073`). `/admin/rights-requests`,
built on that same feature, correctly says "DPDP access / correction /
erasure requests." `/admin/policies`'s own "GDPR & Compliance" tab does
not match it.

## What's wrong, exactly

`frontend/src/pages/admin/Policies.jsx` hardcodes UK-specific legal
references in a live, real settings page an admin can view today:

- Line 192: `"Patient records are retained for this period per UK GDPR requirements."`
- Line 603: `"HealthSync is configured to process personal data in accordance with UK GDPR and the Data Protection Act 2018."`
- Line 616: `title: 'Right to Erasure (GDPR Art.17)'`
- Line 543: `"...(GDPR Art.20) from their own account."`

Confirmed live in the browser — the "GDPR & Compliance" tab's own info
banner reads exactly: *"HealthSync is configured to process personal
data in accordance with UK GDPR and the Data Protection Act 2018."*
For an India-market healthcare product, this is not a copy-editing
nicety — it is a live, admin-facing statement about which law the
product claims to comply with, and it names the wrong one.

**Same class, a second file, public-facing this time**:
`frontend/src/pages/auth/login.jsx` line 657 — the login page's own
marketing bullet list reads `'Secure and private — GDPR compliant'`,
confirmed live on the real `/login` page every visitor sees before
signing in, logged-out or not.

## Acceptance criteria

- The Policies tab's own compliance statement, retention-period
  description, and named articles reference India's DPDP Act 2023
  (matching the terminology `/admin/rights-requests` already uses
  correctly), not UK GDPR/the Data Protection Act 2018.
- Any DPDP-specific right (e.g. erasure/correction) is cited by its real
  DPDP section, not a carried-over GDPR article number — needs a
  product/legal decision on the exact citation if not already settled
  elsewhere in this codebase's own DPDP work.
- The login page's marketing bullet references DPDP compliance (or a
  neutral "secure and private" claim with no specific wrong-jurisdiction
  law named), not GDPR.
