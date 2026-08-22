---
id: PLAN029
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG008
related: [F-26, F-22, F-29, F-18, TP056, TR055]
---

# PLAN029 — CI, and the two defects that had to be fixed to make it possible

Closes Phase F. `00-foundation-hardening.md` §6 names F-22 and F-29 as
prerequisites inside this phase; both turned out to be real defects rather than
configuration chores, and F-29's root cause was a production bug.

## Order of work, and why

CI last, prerequisites first — not for tidiness, but because a workflow written
against a broken lint script and an OOM-killed test command would have had to be
written twice.

1. **F-22 first.** It is self-contained and its output is unreadable until
   fixed, so leaving it would have meant writing the frontend job blind.
2. **F-29 second**, because it required diagnosis rather than a known fix.
3. **CI last**, once every command it runs was proven locally.

## F-22 — diagnosis

Two defects stacked, and the second was hidden by the first:

- `--ext js,jsx` is rejected by flat config, so the script exited before linting
  anything. Removed; `files: ['**/*.{js,jsx}']` in `eslint.config.js` already
  scopes it.
- `eslint-plugin-react` was installed but never registered. `no-unused-vars`
  needs `react/jsx-uses-vars` to know a JSX-referenced import is used, so
  **2,862 of 2,892 problems were false**.

Registered only `jsx-uses-react` and `jsx-uses-vars`. Enabling the full React
ruleset would have turned a bug fix into a style migration.

### The 12 errors, decided individually rather than in bulk

Every `no-autofocus` site was read. All 11 are correct focus management — modal
dialogs (WAI-ARIA APG requires focus to move in), user-initiated inline edit
rows, and multi-step wizard transitions.

Inline `eslint-disable` comments were **attempted and rejected**: the violation
is reported on the `autoFocus` prop's own line, which sits inside a JSX opening
tag where neither `//` nor `{/* */}` comments are syntactically valid. Every
workaround is fragile against reformatting. Downgrading the rule to a warning,
with the reasoning in the config, is honest about what was decided and keeps new
uses visible.

`media-has-caption` is the opposite case — a real gap, downgraded so it stops
blocking but logged as `context/open-questions.md` #10 rather than buried.

Fixing the script also surfaced **two stale `eslint-disable` directives** that
had accumulated precisely because the script never ran. Removed.

Warnings: `--max-warnings 197` as a ratchet. 0 would have meant a 167-file
unused-variable sweep inside a CI slice; a ratchet blocks new warnings today and
can only be lowered.

## F-29 — diagnosis

`--detectOpenHandles` was the prescribed tool and it **hung** on both the full
integration suite and a single spec, so it produced nothing. Reasoning about
sources beat re-running it:

`PrismaService` had `onModuleDestroy`. `RedisModule` had **no lifecycle hook at
all** — `new Redis(url)` holds a socket and reconnect timers forever. That is a
production bug: `SIGTERM` left the connection dangling and `app.close()` never
resolved.

`onApplicationShutdown` rather than `onModuleDestroy`: `RedisModule` is
`@Global()` and other modules' shutdown paths may still need it, and
application-shutdown hooks run after all modules are destroyed. `quit()` over
`disconnect()` because it drains in-flight commands; wrapped, because it rejects
on an already-dead connection and a throw there would mask the real shutdown
reason. `main.ts` gained `enableShutdownHooks()` — without it Nest never listens
for the signal.

**Verifying the residue rather than assuming.** After the fix, Jest still printed
"did not exit". Rather than reaching for `--forceExit`, a probe
(`process._getActiveHandles()` after `app.close()`) returned exactly two entries:
**stdout (fd 1) and stderr (fd 2)** — Node's own streams, which never hold the
loop. `--detectOpenHandles` agreed: zero. So `forceExit: true` went into the
config *with that evidence written next to it*, because the next person will
otherwise re-hunt a leak that is not there.

**bcrypt.** Cost 12 was declared three times independently. Centralised into
`common/crypto/bcrypt-cost.ts`, overridable by env, and **refusing to start**
below 12 when `NODE_ENV=production`. `users.service.spec.ts` asserted the literal
`12`; that assertion now compares against the constant, and a dedicated
`bcrypt-cost.spec.ts` pins the production default so "make tests faster" can
never quietly become "make production hashes cheaper".

**Workers.** Measured, not guessed: default → OOM (exit 137), 2 → 182s + spurious
warning, `--runInBand` → 118s clean. Fewer is faster here; `npm test` now defaults
to the safe one.

## CI

Five jobs. Every command is the same one a developer runs locally — a CI step
that cannot be reproduced locally gets ignored the first time it goes red.

`integration` needs both Postgres and Redis service containers and is the only
job that could have caught F-01 or BUG006.

The schema job runs `prisma migrate diff` against the migration history, which is
the specific failure hand-written migrations invite. It is `continue-on-error`
today because of 33 lines of drift recorded in `TR053`, and that is stated in the
file rather than left as an unexplained flag.

### The structural gate

`scripts/check-page-data-wiring.mjs` asks the inverse question to every previous
audit: not "does this import the mock store" but "does a file that renders data
have any route to real data at all". Deliberately conservative — files with
props, context, or router params are excluded, because a gate that flags
presentational components gets deleted within a week.

It found 7 previously-unknown fabricated pages, all with real backends they
ignore. Allowlisted with notes and reported, not fixed — that is its own slice.

## Deliberately not in this slice

e2e in CI (blocked on F-27/F-28), wiring the 10 fabricated pages, the 197
frontend warnings, and the 33 lines of schema drift.
