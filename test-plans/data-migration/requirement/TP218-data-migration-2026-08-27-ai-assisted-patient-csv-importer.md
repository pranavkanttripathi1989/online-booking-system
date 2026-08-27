---
id: TP218
type: requirement
feature: data-migration
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN198
related: [REQ157, TR218]
---

# TP218 — Test plan: AI-assisted patient CSV importer (P2-05)

Genuinely new domain (first slice of a new feature slug). Suggestion
stage skipped per `CLAUDE.md`'s own conditional rule for a well-scoped
slice against already-proven patterns (`P1-11`'s own transcript
classifier reuse, `tasks.service.ts`'s own `orgIdForWrite` guard) —
drafted directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1–10 | Headers/rows parsed correctly; CRLF/LF; quoted fields with commas/newlines/escaped quotes; no phantom trailing row; no trailing newline; empty content; header whitespace trimmed; empty cell preserved | `csv-parser.spec.ts` |
| 11–22 | Every real header pattern maps to its correct target; first/last_name specificity wins over the bare "name" rule; unrecognized header left unmapped; case/underscore/hyphen tolerance; order preserved | `column-mapping.spec.ts` |
| 23–28 | `mapRow` splits/joins full_name correctly, ignores an unknown source column, explicit first_name wins over a full_name split | `row-validation.spec.ts` |
| 29–37 | `validateCandidate` accepts a valid candidate; rejects each missing required field individually; rejects a malformed email/date; reports every violated rule at once | same |
| 38–42 | Short cells pass through unchanged; a real multi-sentence blob is structured into labeled sections; no fact is invented; a no-punctuation blob still classifies via the default bucket; whitespace trimmed | `structure-notes.spec.ts` |
| 43–65 | Preview returns real headers/sample/mapping/total; sample rows capped for a large file; dry run counts/row-numbers correctly, never writes to the DB; commit rejects an org-less operator, creates only valid rows scoped to the caller org, skips the bulk create with zero valid rows, writes a real `ImportJobs` audit row, runs the AI-structuring wedge only when a notes column is mapped | `imports.service.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | The new migration (`ImportJobs` table + FKs) applies cleanly via `migrate deploy` |
| 2 | `matrix-coverage.int-spec.ts`'s own gate correctly fails on the new unclassified `imports` domain until the `EXEMPT` entry is added, then passes |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Uploads a CSV and advances to mapping with real suggested mappings pre-filled | `manager/imports/index.test.jsx` |
| 2 | Runs a dry run with the current mapping and shows real result counts | same |
| 3 | Shows real per-row errors from a dry run, never a fabricated success | same |
| 4 | Commits via the real mutation and shows the real final result | same |
| 5 | Lets a human override a suggested mapping before running the dry run | same |

## Out of scope for this test plan

- Appointment/encounter import, per-vendor mappers, an `.xlsx` binary
  parser, and a job-history/list page — all deliberately out of this
  slice's own scope (see REQ157's own scope notes).
- E2E/Playwright coverage — a new, isolated manager page; `MockedProvider`-
  based unit coverage against the real query/mutation contracts is the
  established pattern for this codebase's own manager-page test files.
