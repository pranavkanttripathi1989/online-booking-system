---
id: BUG059
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [PLAN234, TP254, TR254]
---

# BUG059 — three new instances of the documented `AuthContext` login-cache gap

## Background

CLAUDE.md already documents a real, pre-existing `AuthContext.jsx` bug:
`useAuth().user.patient.id`/`user.clinician` are permanently `undefined`
on a fresh login, because `LOGIN_MUTATION` never selects those
sub-fields and the fuller `ME_QUERY` (which does) only runs when no
cached user exists yet — a fresh login always populates that cache
first. Three prior instances were already worked around
(`clinician/Dashboard.jsx`, `settings/index.jsx`'s Privacy tab,
`patients/Family.jsx`'s self-scoped query design). This bug closes
three more, found by the "check all fronend page and fix the backend
and fronend intgartionn gap" audit's patient/clinician sweep.

## What was found

1. **`patient/Profile.jsx:102`** — `const patientId = user?.patient?.id`
   read the cached login object directly. On a fresh patient login this
   is `undefined`, the profile query was skipped, and the page showed
   "Your account isn't linked to a patient record yet" — a false,
   misleading message for every real, correctly-linked patient's first
   session, blocking them from viewing or editing their own profile.
2. **`clinician/Availability.jsx:275`** — `const clinicianId =
   user?.clinician?.id ?? 'clin-1'` fell through to a hardcoded dev/demo
   literal on a fresh clinician login. Worse than a display bug: this
   value was sent on every write (`saveAvailability`/`saveLunchBreak`),
   so the backend's own self-scope check
   (`availability.service.ts#assertClinicianAccess`) rejected every
   fresh-login clinician's own save/delete of their own schedule.
3. **`clinician/Calendar.jsx:601,619-621`** — `getLunchBreaks` was
   permanently `skip`-ped on `!user?.clinician?.id` (not merely
   delayed — a fresh session never re-tries), so lunch-break blocks
   never rendered; the clinician's own name fell through to the
   hardcoded placeholder `'Dr. Sarah Mitchell'`.

## Fix

Each file gained a dedicated `network-only` re-fetch mirroring
`clinician/Dashboard.jsx`'s own `GET_MY_CLINICIAN_PROFILE` pattern
(`me { patient { id } }` / `me { clinician { id, full_name } }`),
consulted only as a fallback when the cached `user` object doesn't yet
carry the field. No change to `AuthContext.jsx` itself — deliberately,
per the standing caution in CLAUDE.md that the core caching fix needs
its own reviewed slice, not a rider on an unrelated pass.

See `PLAN234`/`TP254`/`TR254`.
