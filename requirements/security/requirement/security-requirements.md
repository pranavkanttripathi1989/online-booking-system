---
id: REQ001
type: requirement
feature: security
created: 2026-08-17
updated: 2026-08-17
status: approved
parent: null
related: []
---

# Security Requirements — MediBook/HealthSync Backend

**Why this exists:** this is a multi-tenant healthcare SaaS handling patient PII, payment data, and cross-organization data isolation, for the Indian market. A security gap here isn't just a bug — it's a compliance and trust failure. This doc is the concrete, OWASP-grounded checklist every backend phase in `context/backend-implementation-plan.md` must satisfy before being considered done, not a general aspiration.

Framework reference: **OWASP Top 10 (2021/2025)** and **OWASP ASVS** (Application Security Verification Standard) — each section below maps to the relevant OWASP category.

---

## 1. Identifiers (OWASP A01 — Broken Access Control)

- **All primary keys are UUIDs, never auto-increment integers.** Already true across all 34 models in `schema.prisma` (`@id @default(uuid())`) — verified this session, keep it that way for every new model.
- No sequential/guessable secondary identifiers either (invoice numbers, appointment reference codes) — if a human-readable reference is needed (e.g., an invoice number for GST compliance), use a non-sequential scheme (date-prefixed + random suffix), not `INV-0001, INV-0002...`.

## 2. Authentication (OWASP A07 — Identification & Authentication Failures)

- Passwords: bcrypt (cost factor ≥ 12) or argon2id. Never a custom hash scheme.
- JWT access tokens: short-lived (15 min), carry `sub`, `roles`, `client_org_id` (tenant scope — **required**, not optional).
- Refresh tokens: **rotation on every use** — reusing an already-rotated refresh token must invalidate the whole token family (detects token theft). See `test-cases/01-authentication/test-cases.md` TC-AUTH-UNIT-005.
- OTP (MSG91/Gupshup): 6-digit, 5-minute TTL, max 3 verification attempts before forcing a new OTP request, never returned in any API response body.
- Generic error messages on login/OTP-request failure — never reveal whether an email/phone is registered (prevents user enumeration). See TC-AUTH-API-002/003/011.
- Rate limiting on `login`, OTP request/verify, and password-reset endpoints — independent of per-account lockout (protects against distributed credential stuffing across many accounts, not just one). See TC-AUTH-API-012/013.
- Account lockout after repeated failed attempts on one account, enforced server-side (today it's a client-side-only fake, per `frontend-contract-analysis.md §3`) — must become real.

## 3. Authorization & multi-tenancy (OWASP A01 — Broken Access Control)

This is the single highest-risk area in the whole system, and the area the existing frontend explicitly does **not** enforce (`frontend-contract-analysis.md §3/§8`) — the backend is the only line of defense.

- **Row-level tenant isolation**: every query touching a tenant-owned table must filter through `client_org_id` derived from the JWT — never from a client-supplied parameter. A Prisma middleware or repository-layer helper should inject this automatically so no individual resolver can forget it.
- **Row-level ownership scoping**: a patient can only read/write their own `Patients`/`Appointments` rows; a clinician only their own patients/schedule. Verify with explicit negative tests, not just positive ones (a request for someone else's data must fail, not just "not be shown by the UI").
- **Role guards on every mutation**, not just route-level — the frontend's `RoleGuard` only wraps `/manager/*` and `/admin/*`; every other domain (appointments, patients, billing) needs its own server-side role + ownership check regardless of what route called it.
- Research finding (from this session's test-case-writing agents): the current mock/frontend code has **zero tenant-isolation tests anywhere** across Clinics, Rooms, Products, Services — several modules even use a **hardcoded fallback tenant ID** (`clinicId ?? "1"`) when the real value is missing. This exact pattern must never exist in the real backend — a missing tenant context should reject the request, never silently default to some other tenant's data.

## 4. Input validation & injection (OWASP A03 — Injection)

- Every mutation input goes through a `class-validator` DTO — no raw client input reaches Prisma unvalidated.
- Prisma's parameterized queries close off classic SQL injection by default — never drop to `$queryRawUnsafe` with interpolated strings; if raw SQL is ever needed, use `$queryRaw` with tagged-template parameterization only.
- GraphQL-specific: query depth limiting (`graphql-depth-limit`) and query complexity limiting, to prevent a maliciously nested query from being a DoS vector.
- File uploads (profile photos, org logos): validate MIME type and size server-side, not just via the `accept` attribute on the frontend `<input>` (client-side validation is a UX nicety, never a security boundary).

## 5. Payments & financial data (OWASP A08 — Software & Data Integrity Failures)

- **Razorpay webhook/payment verification**: always verify the HMAC signature server-side before trusting any payment-confirmation payload — never trust a client-reported "payment succeeded" state alone.
- Money stored as integer paise everywhere (already decided) — never float rupees, which would introduce rounding-based tampering/discrepancy risk in addition to the correctness problem.
- GST fields (GSTIN, HSN/SAC) are compliance-sensitive but not secret — still validate format server-side (a malformed GSTIN shouldn't silently corrupt an invoice).
- Stripe (tenant SaaS billing) and Razorpay (patient payments) keys: environment variables only, never committed, never returned to the frontend beyond the public/publishable key.

## 6. Data protection & compliance (India DPDP Act 2023)

- Patient health data is sensitive personal data under India's DPDP Act — host in `ap-south-1`, as already decided.
- Encrypt sensitive fields at rest where the database doesn't already (Postgres + disk encryption is the baseline; consider field-level encryption for anything like `social_security_number` if that field is ever actually populated for India — confirm with the client whether this Western-shaped field is even needed, or should be replaced with an Indian ID type).
- Audit logging (`AuditLogs` model, already in schema): every mutation should log actor, action, entity, and a before/after diff — required both for security incident response and for the compliance trail DPDP implies.
- Telemedicine (video consultations): capture clinician registration number + explicit patient consent timestamp, per India's Telemedicine Practice Guidelines 2020 — already flagged in `context/backend-implementation-plan.md`'s India table.

## 7. Transport & infrastructure (OWASP A02 — Cryptographic Failures)

- TLS everywhere in production — no plaintext HTTP for any API traffic, including internal service-to-service calls where feasible.
- CORS locked to the known frontend origin(s) — never `*` in production.
- `helmet` (or NestJS equivalent) for standard security headers (CSP, X-Frame-Options, etc.).
- Secrets via environment variables / a secrets manager — never committed to the repo. Double-check `.env.example` files never contain real values before any commit.

## 8. Dependency & supply chain hygiene (OWASP A06 — Vulnerable Components)

- This was flagged during the earlier Python-vs-Node security discussion: npm's large transitive dependency graph has a worse supply-chain track record than more conservative ecosystems — run `npm audit` (or equivalent) as part of CI, and prefer well-maintained, widely-used packages over obscure ones for anything security-adjacent (auth, crypto, payment SDKs).

## 9. Database security

Application-level tenant scoping (§3) is necessary but not sufficient — a bug in one resolver shouldn't be able to leak every tenant's data. Defense in depth at the database layer:

- **Postgres Row-Level Security (RLS) as a second, independent enforcement layer.** Enable RLS on every tenant-owned table and add a policy keyed on `client_org_id` matching a session variable set per-request (`SET app.current_org_id = '<uuid>'` at the start of each transaction, derived from the JWT — never client-supplied). This means even if a resolver forgets its Prisma `where: {client_org_id}` filter, the database itself still refuses to return other tenants' rows. This is the single most important addition for a multi-tenant healthcare system and should not be treated as optional hardening — build it alongside Phase 2 (database & seed), not deferred to Phase 15.
- **Least-privilege database roles.** The application connects as a dedicated role with only the DML/DDL it actually needs (`SELECT/INSERT/UPDATE/DELETE` on app tables) — never as the Postgres superuser. Migrations run under a separate, more-privileged role used only by the deploy pipeline, never embedded in the running app's credentials. No human has standing direct access to the production database; access goes through an audited bastion/session-recording tool if ever needed.
- **Network isolation.** The database is not publicly reachable — private subnet/VPC only, security group rules scoped to the application servers' IPs, no `0.0.0.0/0` inbound. `docker-compose.yml`'s current pattern of exposing `MYSQL_PORT`/would-be `POSTGRES_PORT` directly to the host is fine for local dev only — the production deployment must not replicate this.
- **Encryption in transit.** All connections require TLS (`sslmode=require` or `verify-full` once a real cert chain exists) — this includes the app→DB connection and any admin tooling (pgAdmin, migration jobs), not just the public-facing API.
- **Encryption at rest.** Enable storage-level encryption on the managed Postgres instance (AWS RDS encryption in `ap-south-1`, matching the already-decided hosting region) — required baseline given this database holds patient health data.
- **Credential management.** DB credentials live in a secrets manager (AWS Secrets Manager or Parameter Store), never in a committed `.env` file, rotated on a schedule and immediately on any suspected exposure. `docker-compose.yml`'s current plaintext default passwords (`rootpassword`, `medibook_secret`) are dev-only conveniences — flag clearly in deployment docs that these must never reach a production environment file.
- **Backups.** Automated, encrypted backups with a tested restore process (an untested backup is not a backup) — retention period should account for both operational recovery needs and any data-retention obligations under India's DPDP Act.
- **Database-level audit logging**, independent of the application's `AuditLogs` table — Postgres logging (or `pgAudit`) capturing connection attempts and schema-level changes, so a compromise of the application layer doesn't also blind the audit trail.
- **Connection pooling with limits** (PgBouncer or RDS Proxy) — prevents a connection-exhaustion DoS from a runaway resolver or traffic spike from taking down the database for every tenant at once.
- **Migration review discipline.** Every migration touching an existing table (especially `DROP COLUMN`/`DROP TABLE`) gets reviewed for reversibility and run against a staging copy first — a bad migration is one of the few backend mistakes that can't be fixed by redeploying.

## 10. How this gets enforced

- Every domain's `test-cases/*.md` file should have explicit negative/security test cases in its Backend/API section (row-level scoping, cross-tenant isolation, auth guards) — `test-cases/01-authentication/test-cases.md` TC-AUTH-API-007 through 013 is the pattern to replicate; the agents writing the remaining 13 domain files have been told to do the same.
- `context/backend-implementation-plan.md` Phase 15 ("Security hardening") is not a final cleanup pass — the row-level authorization and tenant isolation pieces in particular must be built alongside each domain's resolvers in Phases 4-14, not bolted on afterward.
- Before this backend ships, run the `security-review` skill against the implemented code (it exists in this environment specifically for this purpose) rather than relying solely on this document's checklist being followed by memory.
