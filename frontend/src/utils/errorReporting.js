// P1-18 — client error reporting, matching ErrorBoundary.jsx's own
// pre-existing "Future: send to error reporting service (Sentry, etc.)"
// comment. The @sentry/react SDK is loaded via a dynamic import inside
// reportError() itself, never a static one — this codebase's tight
// initial-bundle budget (344.7/350 KB measured before this slice) has
// almost no headroom, and the overwhelming majority of sessions never
// hit an error boundary at all, so shipping Sentry's code to every user
// on every page (PERF-9's own "lazy-load everything expensive" spirit)
// would be pure waste. Nothing Sentry-related is in any route's bundle;
// it is fetched only in the rare case an error actually fires.
//
// SEC-5 is the hard constraint: health data must never reach a
// third-party tool. Rather than trying to redact "known PHI fields"
// from the real error (a blocklist that will always miss something a
// future error message interpolates), the event sent is rebuilt from an
// explicit allowlist: error type name, a stack trace, and the route
// pattern only. The original message, component props, and any
// GraphQL/network payload are never attached, by construction.

let sentryClient = null
let initPromise = null

async function ensureSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return null // unconfigured -- clean no-op, matches every backend vendor's own convention
  if (sentryClient) return sentryClient
  if (!initPromise) {
    initPromise = import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0, // error capture only, no performance/session-replay integration
        beforeSend: scrubEvent,
        beforeBreadcrumb: () => null, // breadcrumbs can accumulate request/response bodies over a session
      })
      sentryClient = Sentry
      return Sentry
    })
  }
  return initPromise
}

// Exported so this redaction logic gets direct unit coverage: under this
// codebase's own Jest/babel shim (see documents.test.js's identical
// comment), `import.meta.env` is unconditionally replaced with a fresh,
// disconnected `{}` at transform time, so a test cannot make
// ensureSentry()'s DSN check see a configured DSN at runtime -- the
// dynamic-import-gated path genuinely cannot be driven end-to-end under
// Jest. Testing this pure function directly is the real coverage for the
// SEC-5 scrubbing behaviour; reportError()'s own unconfigured/no-op path
// is still exercised end-to-end since that path is what Jest can reach.
export function scrubEvent(event) {
  return {
    ...event,
    message: undefined,
    request: undefined,
    user: undefined,
    extra: undefined,
    contexts: undefined,
    breadcrumbs: undefined,
    exception: event.exception
      ? {
          values: (event.exception.values ?? []).map((v) => ({
            type: v.type,
            value: '[redacted, SEC-5]',
            stacktrace: v.stacktrace,
          })),
        }
      : undefined,
  }
}

/**
 * Reports a caught React error to Sentry, if configured, with the error
 * message and component props stripped -- only the error type, a stack
 * trace, and the route pattern (never a resolved URL with a record id)
 * ever leave the browser.
 * @param {Error} error
 * @param {{ componentStack?: string }} info
 * @param {string} [routePattern]
 */
export async function reportError(error, info, routePattern) {
  const Sentry = await ensureSentry()
  if (!Sentry) return
  const scrubbed = new Error('[message redacted -- see server-side logs for detail, SEC-5]')
  scrubbed.name = error?.name || 'Error'
  scrubbed.stack = error?.stack
  // info.componentStack is deliberately not attached: this codebase's own
  // scrubEvent() strips every `contexts` entry regardless, per the same
  // allowlist-not-blocklist policy the backend's captureScrubbedException
  // uses -- a component stack is normally just function/class names, but
  // "normally" isn't the bar SEC-5 sets.
  Sentry.captureException(scrubbed, {
    tags: { route: routePattern ?? window.location.pathname.replace(/[0-9a-f-]{20,}/gi, ':id') },
  })
}
