import * as Sentry from '@sentry/node';

// P1-18 — error tracking. Sentry, matching the vendor
// frontend/src/components/ErrorBoundary.jsx already named in its own
// "Future: send to error reporting service (Sentry, etc.)" comment.
// Fixed vendor (Hard Rule 9 — error tracking is not one of the
// admin-configurable-per-org exceptions), a single SENTRY_DSN env var,
// matching the RAZORPAY_KEY_ID/DAILY_API_KEY "unconfigured = clean
// no-op" convention exactly -- never a crash, never a hard dependency.
//
// SEC-5 is the load-bearing constraint here: health data must NEVER
// reach a third-party tool. Rather than trying to selectively redact
// "known PHI fields" from a raw exception (a blocklist that will always
// miss something a future error message interpolates), every event
// sent to Sentry is rebuilt from scratch with an explicit allowlist:
// error type name and a stack trace only. The original message,
// GraphQL variables, request body, and any breadcrumb data are never
// attached, by construction -- not filtered after the fact.

let initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // unconfigured -- clean no-op, matches every other vendor here
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // No performance/tracing integration here -- OpenTelemetry
    // (tracing.ts) owns spans; Sentry's own job is exception capture
    // only, kept deliberately narrow.
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: () => null, // breadcrumbs can accumulate request/response bodies over a session -- never sent
  });
  initialized = true;
}

export function isSentryConfigured(): boolean {
  return initialized;
}

// Exported for the GraphQL formatError hook and any REST-side exception
// filter to call directly, rather than passing a raw exception to
// Sentry.captureException() and trusting its own default serialization
// not to include the message.
export function captureScrubbedException(error: unknown, tags?: Record<string, string>): void {
  if (!initialized) return;
  const scrubbed = scrubError(error);
  Sentry.captureException(scrubbed, { tags });
}

function scrubError(error: unknown): Error {
  const original = error instanceof Error ? error : new Error('Non-Error value thrown');
  const scrubbed = new Error('[message redacted -- see server-side logs for detail, SEC-5]');
  scrubbed.name = original.name || 'Error';
  scrubbed.stack = original.stack;
  return scrubbed;
}

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
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
          values: event.exception.values?.map((v) => ({
            type: v.type,
            value: '[redacted, SEC-5]',
            stacktrace: v.stacktrace,
          })),
        }
      : undefined,
  };
}
