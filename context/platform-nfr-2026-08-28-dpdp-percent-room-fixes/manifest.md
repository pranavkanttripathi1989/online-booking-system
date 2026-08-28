---
id: CTX-platform-nfr-2026-08-28-dpdp-percent-room-fixes
type: bug
feature: platform-nfr
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG030, BUG034, BUG037, PLAN205, TP225, TR225]
---

# DPDP citation, percent formatting, and room-display fixes (2026-08-28)

Third fix batch from the 2026-08-28 five-role QA sweep — three small,
independent findings with no shared root cause, batched for one
verification pass.

- **BUG030**: `admin/Policies.jsx` and `auth/login.jsx` cited UK
  GDPR/the Data Protection Act 2018 throughout, wrong jurisdiction for
  an India-market product with an already-shipped `compliance-dpdp`
  feature. Fixed every visible reference to India's DPDP Act 2023;
  dropped two specific GDPR article citations rather than guess a DPDP
  equivalent, flagged for legal counsel instead.
- **BUG034**: raw unrounded floats (`2.9629629629629632%`) on
  `/manager/dashboard`. New shared `formatPercent()` helper alongside
  the existing `formatCurrency()`.
- **BUG037**: `/manager/rooms` showed "Room Room 3A" (hardcoded prefix
  doubling an already-complete `room_number` string) and a null room
  type name. Root-caused the second half via a direct DB check before
  touching any code: two real rows held a corrupted literal string
  (`'consultation'`) instead of a real `room_types.id`, predating the
  current create/edit form's own correct id-based convention. Fixed
  with a one-time backfill migration, not a code change (the resolver
  was already correct) and not an ad-hoc live `UPDATE`.

Live-verified against the real dev stack for all three.

## Documents

- `requirements/compliance-dpdp/bug/BUG030-*.md` (done)
- `requirements/analytics-reporting/bug/BUG034-*.md` (done)
- `requirements/catalog-master-data/bug/BUG037-*.md` (done)
- `implementation-plans/platform-nfr/bug/PLAN205-*.md`
- `test-plans/platform-nfr/bug/TP225-*.md`
- `test-results/platform-nfr/bug/TR225-*.md`
