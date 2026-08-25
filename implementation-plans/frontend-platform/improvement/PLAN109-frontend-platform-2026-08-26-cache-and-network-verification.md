---
id: PLAN109
type: improvement
feature: frontend-platform
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ078
related: []
---

# PLAN109 — Verification plan for the `cache-and-network` check (F-21)

No code change — see `REQ078` for why. Verification was: read each of
the 4 target pages' primary `useQuery` call
(`pages/queue/index.jsx:71`, `pages/appointments/index.jsx:238`,
`pages/calendar/index.jsx:438`, `pages/dashboard/index.jsx:112`) and
confirm the `fetchPolicy` option each one already passes.
