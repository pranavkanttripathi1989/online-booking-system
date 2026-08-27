const mockInit = jest.fn();
const mockCaptureException = jest.fn();

jest.mock('@sentry/node', () => ({
  init: (...args: unknown[]) => mockInit(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe('sentry (P1-18)', () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.SENTRY_DSN = originalDsn;
  });

  it('is a clean no-op when SENTRY_DSN is unset, matching every other vendor in this codebase', () => {
    delete process.env.SENTRY_DSN;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry, captureScrubbedException, isSentryConfigured } = require('./sentry');
    initSentry();
    expect(mockInit).not.toHaveBeenCalled();
    expect(isSentryConfigured()).toBe(false);

    captureScrubbedException(new Error('boom'));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('initializes with tracesSampleRate 0 and a scrubbing beforeSend/beforeBreadcrumb when a DSN is configured', () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.example/1';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry, isSentryConfigured } = require('./sentry');
    initSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
    const config = mockInit.mock.calls[0][0];
    expect(config.tracesSampleRate).toBe(0);
    expect(typeof config.beforeSend).toBe('function');
    expect(config.beforeBreadcrumb()).toBeNull();
    expect(isSentryConfigured()).toBe(true);
  });

  it('never sends the real error message to Sentry -- only a redacted placeholder (SEC-5)', () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.example/1';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry, captureScrubbedException } = require('./sentry');
    initSentry();

    captureScrubbedException(new Error('Patient Jane Doe has a penicillin allergy'), { domain: 'prescriptions' });

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [sentError, options] = mockCaptureException.mock.calls[0];
    expect(sentError.message).not.toMatch(/Jane Doe|penicillin/i);
    expect(sentError.message).toMatch(/redacted/i);
    expect(options).toEqual({ tags: { domain: 'prescriptions' } });
  });

  it('preserves the real error name for Sentry grouping, since a type name alone carries no PHI', () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.example/1';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry, captureScrubbedException } = require('./sentry');
    initSentry();

    class PatientLookupError extends Error {
      constructor(message: string) {
        super(message);
        // Standard JS subclassing gotcha: extending Error does NOT give
        // .name the subclass name unless the constructor sets it
        // explicitly -- matches this codebase's own custom exceptions.
        this.name = 'PatientLookupError';
      }
    }
    captureScrubbedException(new PatientLookupError('irrelevant'));

    const [sentError] = mockCaptureException.mock.calls[0];
    expect(sentError.name).toBe('PatientLookupError');
  });

  it("the beforeSend hook strips message/request/user/extra/contexts/breadcrumbs and redacts every exception value", () => {
    process.env.SENTRY_DSN = 'https://fake@sentry.example/1';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initSentry } = require('./sentry');
    initSentry();

    const beforeSend = mockInit.mock.calls[0][0].beforeSend;
    const rawEvent = {
      message: 'Patient Jane Doe, DOB 1990-01-01',
      request: { url: '/graphql', data: { patient_id: 'abc' } },
      user: { id: 'u1', email: 'jane@example.com' },
      extra: { query: 'query { patient { name } }' },
      contexts: { some: 'thing' },
      breadcrumbs: [{ message: 'clicked button' }],
      exception: { values: [{ type: 'Error', value: 'Patient Jane Doe has diabetes', stacktrace: { frames: [] } }] },
    };

    const scrubbed = beforeSend(rawEvent);

    expect(scrubbed.message).toBeUndefined();
    expect(scrubbed.request).toBeUndefined();
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expect(scrubbed.contexts).toBeUndefined();
    expect(scrubbed.breadcrumbs).toBeUndefined();
    expect(scrubbed.exception.values[0].value).toBe('[redacted, SEC-5]');
    expect(scrubbed.exception.values[0].type).toBe('Error');
  });
});
