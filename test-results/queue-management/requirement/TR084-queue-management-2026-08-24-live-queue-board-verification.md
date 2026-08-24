---
id: TR084
type: requirement
feature: queue-management
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP085
related: [REQ019, PLAN058]
---

# TR084 — Results for live queue board, queue actions, and unbilled-visits report

Executed 2026-08-24 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 queueBoard cross-org rejected | **pass** | `queue.service.spec.ts` |
| TC-02 queueBoard cross-clinician rejected | **pass** | |
| TC-03 queueBoard shape (now-serving/waiting/avg wait) | **pass** | |
| TC-04 clinician self-scoping | **pass** | 2 cases (`queueEntries`, `clinicQueue`) |
| TC-05 staff not self-scoped | **pass** | 2 cases |
| TC-06 callNext — none waiting rejected | **pass** | |
| TC-07 callNext — promotes earliest, logs, publishes | **pass** | |
| TC-08 recall cross-org rejected | **pass** | |
| TC-09 recall already-waiting rejected | **pass** | |
| TC-10 recall done/no_show rejected | **pass** | |
| TC-11 recall called/skipped → waiting | **pass** | |
| TC-12 skip done/no_show rejected | **pass** | |
| TC-13 skip default return_after=3 | **pass** | |
| TC-14 skip explicit return_after/reason | **pass** | |
| TC-15 transfer different-clinic target rejected | **pass** | |
| TC-16 transfer reassigns appointment+entry atomically | **pass** | |
| TC-17 unbilledVisits cross-org rejected | **pass** | |
| TC-18 unbilledVisits filter shape | **pass** | |
| TC-19 sync — first check-in creates entry | **pass** | |
| TC-20 sync — re-check-in resets, no duplicate | **pass** | |
| TC-21 sync — no-op with no existing entry | **pass** | |
| TC-22 sync — in_progress/done/no_show mirroring | **pass** | 3 cases |
| TC-23 sync — cancelled/scheduled deletes entry | **pass** | 2 cases |
| TC-24 auto-recall increments, excludes self | **pass** | 2 cases |
| TC-25 auto-recall threshold reached | **pass** | |
| TC-26 tenancy matrix — queue domain | **pass** | new `CASES` entry, `tenancy.int-spec.ts`, 9 reader-archetype cases |
| TC-27 tenancy matrix anti-rot gate | **pass** | |
| TC-28 AppointmentsService existing suite unaffected | **pass** | 44/44, after adding the mocked `QueueService` provider |
| TC-29 full backend suite | **pass** | 62 suites / 903 tests, 0 failures |
| TC-30 backend lint + typecheck | **pass** | both clean |
| TC-31 backend integration suite | **pass** | 4 suites / 234 tests, 0 failures |
| TC-32 full frontend suite | **pass** | 6 suites / 63 tests, 0 failures |
| TC-33 frontend lint (new/touched files) | **pass** | 0 warnings/errors after removing 2 self-introduced ones (unused import, an unstable `useMemo` dependency) |
| TC-34 frontend build | **pass** | `queue/index` and `queue/display` code-split into their own chunks |
| TC-35 e2e full flow | **pass, after one real fix — see narrative** | `queue.spec.js`, 1 test, real dev stack |

## Narrative

**Module-recompile race (development-process issue, not a shipped code
defect).** Creating the entire `queue/` module's files in quick succession,
immediately followed by edits to `appointments.module.ts`/`app.module.ts`,
raced `nest start --watch`'s debounced rebuild: the watch process restarted
mid-edit using a stale file snapshot, and the new module silently never
registered with the GraphQL schema builder — `tsc --noEmit` was clean, the
startup log showed a normal "Nest application successfully started," and
`docker logs` had zero error text anywhere. Only caught by grepping the
generated `schema.gql` for the new `Queue*` type names and finding none.
Fixed by letting all file edits settle, then a clean `docker restart
medibook_backend`; reconfirmed via the same schema.gql grep before
proceeding. No code change was needed — this was purely a development-
environment timing issue, recorded here because it produced zero error
signal anywhere a normal verification pass would have looked.

**TC-35 — one real bug in the e2e spec itself, found while writing it
(not left latent to a later run):** `page.getByLabel('Transfer to')`
substring-matched two elements — the waiting row's "Transfer to another
clinician" icon-button tooltip (rendered as an `aria-label`) and the
transfer dialog's own Autocomplete input. Fixed by scoping the locator to
`page.getByRole('dialog')` first. After the fix, the spec passes cleanly
and repeatably (re-verified with a second full flow: three checked-in
patients queued in order, Call Next → Skip → Transfer, unbilled-visits
panel, TV display — zero leftover fixture rows confirmed after teardown).

## Verdict

**Pass.** REQ019's scoped P0 subset (`US-QUE-03`, `05`, `07`, on top of
`REQ042`'s already-shipped `US-QUE-01` check-in slice) is real, tested, and
verified end-to-end against the real backend — not mocked. P1 items
(`US-QUE-02`, `04`, `06`, `08`) and `US-QUE-01`'s own booked:walk-in
interleaving ratio (blocked on `REQ017`'s own deferred `walkin_ratio` logic)
remain explicitly deferred per `PLAN058`, not silently dropped.
