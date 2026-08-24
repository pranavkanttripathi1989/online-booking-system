---
id: TR107
type: improvement
feature: messaging
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP108
related: [PLAN081]
---

# TR107 — Test results: department/branch-scoped threads, attachments, and canned replies

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP108 case outcomes

All 16 cases pass. `messages.service.spec.ts` gained 20 new cases across
four new describe blocks (department/clinic scoping within `createThread`,
`departmentThreads`, canned replies, `createMessageAttachment`); all 18
pre-existing tests in that file pass unchanged. New `cannedReplies`
tenancy-matrix domain case added.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `npx prisma validate` | Clean |
| `backend: npx jest --maxWorkers=2` | 80/80 suites, 1213/1213 tests (was 80/1198 after REQ057) |
| `backend: eslint` | Clean |
| `backend: tsc --noEmit` | Clean |
| Container compile (`docker restart` + `docker logs`) | "Found 0 errors. Watching for file changes." |

## No real bugs found this pass

Unlike `REQ051`–`REQ053`/`REQ057`, this final slice held on the first
implementation pass — every fix pattern learned earlier in this batch
(optional tenancy-matrix arguments, `isPlatformOperator`/`isSameOrg`
semantics, Hard Rule 6 cross-domain FK validation via
`assertDepartmentInScope`) was applied proactively from the start. The
one genuine design decision made deliberately, not discovered via a
failing test, was gating `cannedReplies`/its 3 mutations to
`@Auth('staff','clinician','manager','admin','super_admin')` — excluding
`'patient'` — while leaving `messageableContacts`/`threads` open to every
role, since canned replies are specifically a staff productivity tool.

## Verification

Real, not just unit-tested: `npx prisma validate`, a full migration apply
+ `prisma generate` on both host and container, a container restart with
a clean "Found 0 errors" compile log (again slow under host load,
confirmed active via `docker stats` rather than wedged, consistent with
every other slice's restart this session), and the full verification
suite above. This closes the 8-slice batch — see the batch's own final
wrap-up documentation (CLAUDE.md narrative section + `context/README.md`)
for the consolidated verification run across all 8 slices together.
