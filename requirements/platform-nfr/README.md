# platform-nfr

## requirement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ035 | requirement | Platform non-functional requirements: performance, scale, availability, accessibility, localisation | draft | 2026-08-22 | 2026-08-22 | — | [REQ035-platform-nfr-2026-08-22-performance-scale-availability-and-accessibility.md](./requirement/REQ035-platform-nfr-2026-08-22-performance-scale-availability-and-accessibility.md) |

## improvement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ038 | improvement | Security headers, boot-time NODE_ENV assertion, and a redesigned auth throttle | done | 2026-08-23 | 2026-08-23 | REQ035 | [REQ038-platform-nfr-2026-08-23-helmet-csp-hsts-node-env-assertion-throttle-redesign.md](./improvement/REQ038-platform-nfr-2026-08-23-helmet-csp-hsts-node-env-assertion-throttle-redesign.md) |
| REQ037 | improvement | Audit-log completeness: outcome, user_agent, and actually populating resource_id/details | done | 2026-08-23 | 2026-08-23 | REQ035 | [REQ037-platform-nfr-2026-08-23-audit-log-completeness.md](./improvement/REQ037-platform-nfr-2026-08-23-audit-log-completeness.md) |
| REQ036 | improvement | `getClinicians` issued one extra query per row instead of one query total | done | 2026-08-23 | 2026-08-23 | REQ035 | [REQ036-platform-nfr-2026-08-23-getclinicians-n-plus-1.md](./improvement/REQ036-platform-nfr-2026-08-23-getclinicians-n-plus-1.md) |

## bug

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| BUG017 | bug | Concurrent bookings for the same slot could all succeed | done | 2026-08-23 | 2026-08-23 | REQ035 | [BUG017-platform-nfr-2026-08-23-booking-concurrency-exclusion-constraint.md](./bug/BUG017-platform-nfr-2026-08-23-booking-concurrency-exclusion-constraint.md) |
| BUG016 | bug | Two more fabricated pages wired to real data; a real gap found and closed along the way | done | 2026-08-23 | 2026-08-23 | REQ035 | [BUG016-platform-nfr-2026-08-23-wire-patient-profile-and-forgot-password.md](./bug/BUG016-platform-nfr-2026-08-23-wire-patient-profile-and-forgot-password.md) |
| BUG015 | bug | P2 "Truth in the UI" quick wins: TableContainer wrappers, dead mock component, stale debug line | done | 2026-08-23 | 2026-08-23 | REQ035 | [BUG015-platform-nfr-2026-08-23-p2-ui-truth-quick-wins.md](./bug/BUG015-platform-nfr-2026-08-23-p2-ui-truth-quick-wins.md) |
| BUG013 | bug | Frontend unit tests for AuthContext, the route guards, booking-wizard validation, and the date/currency formatters | done | 2026-08-23 | 2026-08-23 | REQ035 | [BUG013-platform-nfr-2026-08-23-frontend-unit-tests-guards-auth-booking-formatters.md](./bug/BUG013-platform-nfr-2026-08-23-frontend-unit-tests-guards-auth-booking-formatters.md) |
| BUG012 | bug | The tenancy matrix's 10 KNOWN_GAPS domains are closed, and three real auth gaps found closing them | done | 2026-08-23 | 2026-08-23 | REQ035 | [BUG012-platform-nfr-2026-08-23-tenancy-matrix-known-gaps-closed.md](./bug/BUG012-platform-nfr-2026-08-23-tenancy-matrix-known-gaps-closed.md) |
| BUG010 | bug | The live browser pass BUG009 couldn't run found three real defects | done | 2026-08-23 | 2026-08-23 | REQ035 | [BUG010-platform-nfr-2026-08-23-live-browser-pass-found-three-real-defects.md](./bug/BUG010-platform-nfr-2026-08-23-live-browser-pass-found-three-real-defects.md) |
| BUG009 | bug | Seven routed pages rendered fabricated data while their backend sat unused (F-18) | done | 2026-08-22 | 2026-08-23 | REQ035 | [BUG009-platform-nfr-2026-08-22-seven-fabricated-pages-with-real-backends.md](./bug/BUG009-platform-nfr-2026-08-22-seven-fabricated-pages-with-real-backends.md) |
| BUG008 | bug | No CI, so "verify before you commit" was a convention rather than a control (F-26) | done | 2026-08-22 | 2026-08-22 | REQ035 | [BUG008-platform-nfr-2026-08-22-no-ci-verify-before-commit-is-unenforceable.md](./bug/BUG008-platform-nfr-2026-08-22-no-ci-verify-before-commit-is-unenforceable.md) |
| BUG007 | bug | There were no integration tests; tenant isolation was proven against a mock (F-25) | done | 2026-08-22 | 2026-08-22 | REQ035 | [BUG007-platform-nfr-2026-08-22-no-integration-tests-tenancy-proven-against-a-mock.md](./bug/BUG007-platform-nfr-2026-08-22-no-integration-tests-tenancy-proven-against-a-mock.md) |
| BUG005 | bug | The database declared zero indexes across all 41 models (F-13) | done | 2026-08-22 | 2026-08-22 | REQ035 | [BUG005-platform-nfr-2026-08-22-zero-database-indexes.md](./bug/BUG005-platform-nfr-2026-08-22-zero-database-indexes.md) |
