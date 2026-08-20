---
id: TS037
type: test-suggestion
feature: phase4-backend-integration
created: 2026-08-17
updated: 2026-08-17
status: in-progress
parent: unknown
related: [TP037, TR036]
---

# Phase 4 Backend Integration — Test Suggestions

**Module:** Live frontend↔backend integration — Clinics, Rooms, Organizations, Reference Data
**Found via:** Live browser testing (Playwright MCP) against the real Docker stack, 2026-08-17
**Updated:** 2026-08-17

---

## 🔴 High Priority

### SUG-P4-001 — `manager/rooms/index.jsx` uses an incompatible GraphQL contract vs. the rest of the Rooms pages
**Status:** ⏳ PENDING (carried over, not new this pass — first flagged in `context/phase4-catalog-modules-implementation-plan.md` Increment 1)
**Issue:** `rooms/index.jsx` defines its own inline `roomsPaginated(search: SearchInput)` query and a `{success, userErrors, room}`-wrapped `createRoom`/`updateRoom`/`deleteRoom`, using field names (`room_number`, `clinician_type`) that don't match the canonical `RoomInput`→`Room!` contract already live and working in `rooms/create.jsx`/`edit.jsx`/`detail.jsx`.
**Why not fixed alongside the Reference Data bug (SUG-P4-... none, that one's already fixed):** a GraphQL schema can only have one `createRoom` mutation signature. Fixing `rooms/index.jsx` to match the canonical shape breaks nothing (3 other pages already prove the canonical shape is correct and working); rewriting the resolver to match `rooms/index.jsx` instead would break the 3 already-working pages. This needs someone to confirm `rooms/index.jsx` is genuinely the outdated one (its mock IDs — `rm-1`/`cl-1` — don't match any other mock data convention in the codebase, suggesting it is) before a rewrite, not something to guess silently.
**Recommendation:** Rewrite `rooms/index.jsx` against the canonical `ROOMS_QUERY`/`CREATE_ROOM_MUTATION`/`UPDATE_ROOM_MUTATION` from `graphql/queries.js`/`mutations.js`, following the same "was 100% mock, now real with mock fallback" pattern already applied to `manager/clinics/index.jsx` this session. No `deleteRoom` mutation exists on the backend at all yet — would need to be added if this page's delete button is kept.
**Files:** `frontend/src/pages/manager/rooms/index.jsx`, `backend/src/rooms/rooms.resolver.ts`

### SUG-P4-002 — Organizations edit dialog shows a generic "Bad Request Exception" for pincode-format validation failures
**Status:** ⏳ PENDING
**Issue:** `TC-P4-ORG-05` confirmed live: submitting a malformed pincode (e.g. 4 digits instead of 6) correctly blocks the save, but the error alert reads the unhelpful raw string `"Bad Request Exception"` instead of the real validator message (`"Pincode must be a valid 6-digit Indian PIN code"`).
**Root Cause:** `organizations.resolver.ts`'s `toResult()` helper only catches errors thrown *inside* the resolver method body (service-layer `ConflictException`s, e.g. duplicate code — this path works correctly and shows the real message). NestJS's global `ValidationPipe` runs *before* the resolver method executes at all, so a `class-validator` regex failure (`@Matches` on `OrganizationAddressInput.pincode`) throws a `BadRequestException` the `toResult()` catch never sees — it surfaces as a raw top-level GraphQL error instead, and Apollo Client's default `err.message` for that shape is just the generic exception name, not the validator's actual message (which is present, just buried in `extensions.originalError.message`).
**Why not fixed alongside the Reference Data bug:** this is a *systemic* gap (affects every `@Matches`/`@IsEmail`/etc. validator on every resolver using this response pattern, not just Organizations' pincode field specifically), so the real fix is a GraphQL exception filter that reformats `ValidationPipe` rejections into the `{success, userErrors}` shape globally — a bigger, more general piece of work than patching one field, and worth doing once, correctly, rather than as a one-off per mutation.
**Recommendation:** Add a global `GqlExceptionFilter` (or extend `formatError` in `app.module.ts`, which already exists for production stack-trace stripping per `context/backend-hard-rules.md` Rule 4) that detects `class-validator` `BadRequestException`s and surfaces their real per-field messages consistently, for every resolver using the `{success, userErrors}` wrapper pattern (Organizations today; Reference Data as of this session's fix; likely more as Phase 4 continues).
**Files:** `backend/src/app.module.ts`, `backend/src/organizations/organizations.resolver.ts`, `backend/src/lookups/lookups.resolver.ts`

### SUG-P4-003 — Apollo cache goes stale after `createClinic`, hiding the new clinic from other pages' dropdowns
**Status:** ⏳ PENDING
**Issue:** After creating "Koramangala Health Center" via `/manager/clinics/new`, immediately navigating to `/manager/rooms/new` and opening the Clinic dropdown does **not** show the newly-created clinic — only clinics that existed before this browser session's first `CLINICS_QUERY` fetch appear. The clinic exists correctly server-side (confirmed via the clinic's own detail page and via `/manager/clinics`'s list, which does refresh) — this is purely a stale-read on a different page reading the same query from Apollo's in-memory cache.
**Root Cause:** `createClinic` (in `manager/clinics/create.jsx`) has no `refetchQueries: [{ query: CLINICS_QUERY }]` and no manual cache update (`cache.modify`/`cache.writeQuery`) after the mutation resolves. Any other component holding a `useQuery(CLINICS_QUERY)` with the default `cache-first` policy keeps serving its already-fetched (now-stale) list.
**Recommendation:** Add `refetchQueries: [{ query: CLINICS_QUERY }]` to `CREATE_CLINIC_MUTATION`'s `useMutation` options (mirrors the pattern already used correctly elsewhere in this codebase, e.g. `AddPatientDialog` in `patients/index.jsx`). Low-risk, one-line-ish fix; not applied in this pass because it wasn't yet clear whether the intended fix was a targeted `refetchQueries` per mutation or a broader Apollo cache-normalization pass — worth a quick decision, not a guess.
**Files:** `frontend/src/pages/manager/clinics/create.jsx`, `frontend/src/pages/manager/rooms/create.jsx` (the dropdown consumer)

---

## 🟢 Already Fixed (for the record — see `test-result/phase4-backend-integration-test-results.md` BUG-P4-001)

### SUG-P4-000 — Reference Data (Room Types / Clinician Types) create/update/delete were completely non-functional
**Status:** ✅ COMPLETED (fixed live during this test pass, not just suggested)
**Notes:** See `test-result/phase4-backend-integration-test-results.md` for full root-cause detail and verification. Listed here only so this file's numbering makes sense next to `SUG-P4-001` through `003` — the actual suggestion-to-fix work happened directly, not as a deferred item.
