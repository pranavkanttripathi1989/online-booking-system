---
id: REQ029
type: requirement
feature: analytics-reporting
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: REQ007
related: [REQ007, PLAN061, PLAN072, TP099, TR098]
---

## Status (2026-08-24, second slice)

**`US-RPT-02`/`US-RPT-03` shipped** (`PLAN072`/`TP099`/`TR098`), on top of
`US-RPT-01`/`US-RPT-04`'s earlier same-day slice (`PLAN061`): a Patient
report group (`getPatientReportGroup` — new-vs-repeat breakdown,
acquisition-source attribution, a configurable lapsed-patient recall list)
and scheduled report delivery (`ScheduledReports`, an hourly `@Cron` job
checking each schedule's own cadence against `last_sent_at`). See
`context/analytics-reporting-2026-08-24-req029-part2/manifest.md`.

**Deliberately scoped down**: scheduled delivery is email-only for this
slice (WhatsApp deferred — it needs a per-org provider-config lookup
`REQ025`'s own pattern requires, which email delivery doesn't), and actual
sends are stubbed (`console.log`) the same way OTP SMS already is in this
dev environment — no real AWS SES integration exists anywhere in this
codebase yet to send a real email through. The report-computation and
cadence-tracking are real; only the transport is a stand-in. Clinical/
Pharmacy report groups remain blocked on their source modules per this
requirement's own original gap analysis.

# Report groups, scheduled delivery, and true utilisation metrics

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M15 — Reports & Analytics** (report groups table + `FR-RPT-01`–`04`). Cross-referenced against `backend/src/analytics` and `backend/src/dashboard`, and the already-documented utilisation-metric caveat in `context/open-questions.md`.

## Current state vs. PRD ambition

`REQ007` already built a real admin dashboard, and `analytics`/`dashboard` are both genuine backend modules (not mock) querying `Appointments`/`Clinicians`/`Products`/`Clinics` directly. This is a solid operational-reporting foundation. One limitation is already self-documented rather than newly found: utilisation is defined as a completion-rate proxy (`completed ÷ total appointments × 100`), not true slot-capacity utilisation, which the existing code comment explicitly flags as a judgment call, not an oversight.

Gaps against the PRD's fuller report taxonomy (`§9 M15`'s report-group table):

1. **No Clinical report group** — diagnosis frequency, top prescribed molecules, investigation-ordering patterns, follow-up compliance, teleconsult-vs-in-person mix. All of these depend on `REQ020`/`REQ021`/`REQ026` existing first; this is not a gap in the reporting layer so much as a gap in the underlying clinical data to report on.
2. **No Pharmacy report group** — depends on `REQ022`.
3. **No Insurance report group** — depends on `REQ031`.
4. **No Patient report group** (new vs. repeat, acquisition source, retention cohorts, lapsed-patient recall list, NPS) — genuinely missing today with no dependency blocker; buildable now.
5. **No scheduled report delivery** (`FR-RPT-02`) — reports are viewed on-demand only, no email/WhatsApp digest.
6. **No custom dashboard builder** (`FR-RPT-04`) — P2, not urgent.
7. **Role-scoping exists in spirit but should be re-verified** (`FR-RPT-03`) against the corrected `orgScope()` pattern once `project-plans` F-01 lands, since analytics queries are exactly the catalogue-shaped, potentially-unscoped query type that finding was about.

The true-utilisation fix (walking `ClinicianAvailability` minus `Blocks` rather than using the completion-rate proxy) is independently named in `project-plans/05-competitive-analysis.md` Tier 3 item 13 as a competitive-parity item — this requirement should implement that fix as part of closing out the Operational report group, not leave it as a permanent documented caveat.

## Gap classification

- **Extend existing:** Operational and Financial report groups (already real) gain the true-utilisation fix and scheduled delivery; export-to-CSV/XLSX/PDF (`FR-RPT-01`) if not already complete.
- **Net-new, blocked on other requirements:** Clinical, Pharmacy, Insurance report groups.
- **Net-new, unblocked:** Patient report group; scheduled delivery; custom dashboard builder (P2).

## Phase assignment

PRD Phase: `FR-RPT-01`, `03` are effectively **already-satisfied-with-fixes (P0)**; `FR-RPT-02` is **V1 GA (P1)**; `FR-RPT-04` is **V2 (P2)**. The Clinical/Pharmacy/Insurance report groups inherit the phase of their underlying data source (`REQ020`/`021`/`022`/`031` respectively) — they cannot ship earlier than the data they report on.

## Dependencies

- **Requires:** `project-plans` F-01's `orgScope()` fix applied to every analytics query before this requirement is considered complete, not left on the old ternary pattern.
- **Blocks:** none — this module consumes other modules' data rather than gating them.

## User stories

### Epic: True utilisation

**US-RPT-01** — As a Branch Manager, I want utilisation reported as actual slot-capacity usage (booked time ÷ available time), not a completion-rate proxy, so that I can tell whether a clinician's schedule is genuinely full or just has a high completion rate on a light schedule.
- PRD refs: implicit in the Operational report group; the fix is named explicitly in `project-plans/05` Tier 3 item 13
- Priority: P0
- Acceptance criteria: given a clinician with 4 booked hours out of 8 available (per `ClinicianAvailability` minus `Blocks`), utilisation reports 50%, not a completion-rate number; the existing documented caveat in `analytics.entity.ts` is removed once this ships, not left in place alongside the fix.

### Epic: Patient reporting

**US-RPT-02** — As an Org Admin, I want a new-vs-repeat patient breakdown, acquisition source, retention cohorts, and a lapsed-patient list, so that I can act on patient-growth trends rather than only appointment-throughput trends.
- PRD refs: Patient report group
- Priority: P1
- Acceptance criteria: given a date range, the report distinguishes first-time from returning patients, attributes new patients to a recorded acquisition source (referral, online search, walk-in), and surfaces patients with no visit in a configurable lookback window as a recall-candidate list.

### Epic: Scheduled delivery

**US-RPT-03** — As a Branch Manager, I want my daily collections report delivered by email or WhatsApp automatically every morning, so that I don't have to remember to log in and pull it.
- PRD refs: FR-RPT-02
- Priority: P1
- Acceptance criteria: given a report is scheduled daily/weekly/monthly, it is delivered via the org's configured channel priority (reusing `REQ025`'s delivery infrastructure) without manual action.

### Epic: Role-scoped access re-verification

**US-RPT-04** — As the system, I want every report to enforce the same role-scoping rule regardless of query complexity, so that a Branch Manager never sees another branch's numbers and a clinician never sees another clinician's performance.
- PRD refs: FR-RPT-03
- Priority: P0
- Acceptance criteria: given a clinician queries their own performance report, only their own data returns; given the same clinician attempts to query another clinician's report by ID manipulation, the request is refused — this should be added to the tenancy-matrix integration test (`project-plans/04`, F-25) explicitly, since analytics endpoints are exactly the shape of query that finding's F-01 companion bug affected.

## Data model impact

No new core tables beyond what the dependent modules (`REQ020`–`022`, `031`) define — this requirement is primarily new aggregation queries and a scheduled-delivery job, plus:

- New `ScheduledReports` table: `id`, `client_org_id`, `report_type`, `recipients[]`, `cadence`, `channel`, `last_sent_at`.
- `Patients` gains an `acquisition_source` field.

## Non-functional notes

Every new report query must avoid the JS-side aggregation pattern `project-plans` F-15 already flagged in `dashboard.service.ts`/`analytics.service.ts` (looping over full result sets in JavaScript instead of using SQL `groupBy`/`count`) — new reports should be built correctly from the start rather than repeating that pattern and needing a second remediation pass.

## Open questions

None raised in PRD §19 specific to this module.
