import { reportError, scrubEvent } from './errorReporting'

// P1-18 — @sentry/react is dynamically imported inside errorReporting.js
// itself (never a static import -- see that file's own comment on why).
//
// Known environment constraint (documents.test.js carries the identical
// comment): this project's shared babel.config.cjs statically replaces
// EVERY `import.meta` occurrence with a fresh, disconnected `({ env: {} })`
// object literal at transform time -- so a test that does
// `import.meta.env.VITE_SENTRY_DSN = '...'` is writing to a throwaway
// object the source file never reads; ensureSentry()'s DSN check always
// sees `undefined` under Jest, regardless. That makes the
// dynamic-import-gated "DSN is configured" path structurally untestable
// here without changing the shared babel config for every frontend test
// file, which is out of scope for this slice. Real coverage instead
// targets: (1) the genuinely-exercisable unconfigured/no-op path, and
// (2) scrubEvent, the pure SEC-5 redaction function, tested directly.
const mockCaptureException = jest.fn()
jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  captureException: (...args) => mockCaptureException(...args),
}))

describe('reportError (P1-18)', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('is a clean no-op when no DSN is configured (the only state Jest can observe here), matching every backend vendor convention', async () => {
    await reportError(new Error('boom'), { componentStack: 'at X' })
    expect(mockCaptureException).not.toHaveBeenCalled()
  })
})

describe('scrubEvent (P1-18, SEC-5)', () => {
  const rawEvent = {
    message: 'Patient Jane Doe, DOB 1990-01-01',
    request: { url: '/graphql', data: { patient_id: 'abc' } },
    user: { id: 'u1', email: 'jane@example.com' },
    extra: { query: 'query { patient { name } }' },
    contexts: { some: 'thing' },
    breadcrumbs: [{ message: 'clicked button' }],
    exception: {
      values: [{ type: 'Error', value: 'Patient Jane Doe has diabetes', stacktrace: { frames: [] } }],
    },
  }

  it('strips message, request, user, extra, contexts and breadcrumbs entirely -- allowlist, not blocklist', () => {
    const scrubbed = scrubEvent(rawEvent)
    expect(scrubbed.message).toBeUndefined()
    expect(scrubbed.request).toBeUndefined()
    expect(scrubbed.user).toBeUndefined()
    expect(scrubbed.extra).toBeUndefined()
    expect(scrubbed.contexts).toBeUndefined()
    expect(scrubbed.breadcrumbs).toBeUndefined()
  })

  it('redacts every exception value while preserving the type name for Sentry grouping', () => {
    const scrubbed = scrubEvent(rawEvent)
    expect(scrubbed.exception.values[0].type).toBe('Error')
    expect(scrubbed.exception.values[0].value).toBe('[redacted, SEC-5]')
    expect(scrubbed.exception.values[0].value).not.toMatch(/Jane Doe|diabetes/i)
  })

  it('preserves the stacktrace, since a frame list of function/file names alone carries no PHI', () => {
    const scrubbed = scrubEvent(rawEvent)
    expect(scrubbed.exception.values[0].stacktrace).toEqual({ frames: [] })
  })

  it('handles an event with no exception (e.g. a captureMessage call) without throwing', () => {
    const scrubbed = scrubEvent({ message: 'something', user: { id: 'u1' } })
    expect(scrubbed.exception).toBeUndefined()
    expect(scrubbed.message).toBeUndefined()
    expect(scrubbed.user).toBeUndefined()
  })
})
