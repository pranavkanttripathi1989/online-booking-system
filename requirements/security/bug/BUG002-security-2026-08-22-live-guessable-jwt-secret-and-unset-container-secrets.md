---
id: BUG002
type: bug
feature: security
created: 2026-08-22
updated: 2026-08-22
status: done
parent: null
related: [REQ001]
---

# Live backend was signing JWTs with a guessable placeholder secret; four other real secrets were never reaching the container at all

## Severity

**Critical (confirmed live, not theoretical).** This upgrades `project-plans/02-findings-register.md` F-11 from "any environment started without a root `.env` signs tokens with a public, known key" (a conditional risk) to a confirmed fact about the actual running dev environment at the time of discovery.

## Evidence

`docker-compose.yml`'s backend service supplied insecure fallback defaults:

```yaml
- JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:-change-me-in-production}
- JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-change-me-too-in-production}
```

No root `.env` existed (`ls -la .env` → "No such file or directory"), so these fallbacks were the actual live values. Confirmed directly against the running container:

```
$ docker exec medibook_backend sh -c 'echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"; echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"'
JWT_ACCESS_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-too-in-production
```

`backend/.env` — the file a developer might reasonably assume was the real source of truth — turned out to contain the **identical literal placeholder strings**, not real secrets:

```
JWT_ACCESS_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-too-in-production
```

So there was no real secret anywhere in the environment: not in `docker-compose.yml`'s fallback, not in `backend/.env`, not in any root `.env` (none existed). Anyone who read `docker-compose.yml` — including this very audit's own published findings document — had the exact value needed to sign a valid JWT for any user, any role, any organization against the live backend.

**A second, related discovery made while investigating this:** `SETTINGS_ENCRYPTION_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `OTP_TTL_SECONDS` — all present with real-looking values in `backend/.env` — were **completely absent from the running container's environment** (empty string, not the `.env` file's values):

```
$ docker exec medibook_backend sh -c 'echo "SETTINGS_ENCRYPTION_KEY=${SETTINGS_ENCRYPTION_KEY:+SET}"; ...'
SETTINGS_ENCRYPTION_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
OTP_TTL_SECONDS=
```

Root cause: `docker-compose.yml`'s `environment:` list for the backend service only ever explicitly declared `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FRONTEND_URL`. Nothing in the compose file referenced the other four variables, and — for reasons not fully diagnosed here (dotenv-loading timing, working-directory mismatch, or some other cause; filesystem inspection inside the container was abandoned after `docker exec ... ls` calls began hanging indefinitely for unrelated reasons) — `backend/.env`'s values for them were not reaching `process.env` either. **Practical consequence at the time of discovery:** any code path calling `encrypt()`/`decrypt()` in `common/crypto/secrets.ts` (TOTP secret storage, per-org SMS provider credentials) would have thrown `SETTINGS_ENCRYPTION_KEY is not set` on every real call; Razorpay order creation would have thrown `Razorpay is not configured`.

## Fix applied

1. Generated two new 96-hex-character (48-byte) random secrets via `openssl rand -hex 48` for `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, replacing the placeholder strings in `backend/.env`.
2. Created a root `.env` (gitignored — confirmed covered by the existing `.env`/`backend/.env` patterns in `.gitignore`) carrying the real JWT secrets plus the four previously-unset-in-container variables (`SETTINGS_ENCRYPTION_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS`), reusing `backend/.env`'s existing (already-valid, 64-hex-char) encryption key and existing Razorpay sandbox test-mode keys rather than rotating those.
3. Updated `docker-compose.yml`'s backend service to:
   - Remove the insecure `:-change-me-in-production` / `:-change-me-too-in-production` fallback defaults entirely. An unset `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` now resolves to an **empty** string, not a guessable one — and `auth/strategies/jwt.strategy.ts` already has a real fail-closed guard (`if (!secret) { throw new Error('JWT_ACCESS_SECRET must be set'); }`) that makes an empty value a boot-time failure rather than a silent vulnerability.
   - Explicitly pass through `SETTINGS_ENCRYPTION_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `OTP_TTL_SECONDS`, `OTP_MAX_ATTEMPTS` via the compose `environment:` list (sourced from the new root `.env`), rather than relying on the backend's own `.env`-file loading, which this investigation found was not reliably reaching the container.
4. Recreated the backend container (`docker compose up -d backend`) to apply the new environment.

## Verification

All four checks passed once the container was back up (its recreation was
initially blocked by an unrelated Docker Desktop stall — `docker compose up -d
backend` and `docker start` both hung against an otherwise-responsive daemon;
resolved without further action on a later attempt):

1. **Clean boot** — `docker logs medibook_backend` shows every module
   initializing with no new errors, `GraphQLModule` mapped, `Nest application
   successfully started`.
2. **Real secret in effect** — `docker exec medibook_backend sh -c 'echo
   ${#JWT_ACCESS_SECRET}'` returns `96` (the generated secret's length), not the
   19-character placeholder string.
3. **Previously-missing vars now present** — `SETTINGS_ENCRYPTION_KEY` (64
   chars) and `RAZORPAY_KEY_ID` are both set inside the running container.
4. **Login round-trip** — `login(admin@medibook.dev)` against the live GraphQL
   endpoint returns a real `access_token` and the correct user/role payload.

`docker compose config` was separately confirmed correct before recreation —
both the configuration and the running system are now verified.

## Note on root .env.example

`project-plans/02-findings-register.md` F-11 also flagged that the root `.env.example` still documents the abandoned pre-pivot MySQL/Nginx/Pusher/Laravel stack. That rewrite is a larger, separate documentation task and is **not** included in this fix — tracked separately, not silently dropped.

## Note on a related, higher-blast-radius finding not fixed here

`docker-compose.yml`'s Postgres service still defaults `POSTGRES_PASSWORD` to the weak, published value `medibook_secret`, and Postgres's port is mapped to the host. This was **not** fixed as part of this bug, because — unlike the JWT secrets — the Postgres password is already baked into the existing `postgres_data` volume from its first initialization; changing the compose-level env var alone would not change the actual database role's password and would instead break the backend's `DATABASE_URL` connection on next start. Rotating it safely requires either an in-place `ALTER ROLE ... PASSWORD` against the running database or a deliberate, data-preserving migration — a larger, riskier change than this bug's scope, and logged here rather than bundled in or silently left unaddressed.
