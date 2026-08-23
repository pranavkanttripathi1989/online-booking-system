import { assertKnownNodeEnv } from './assert-known-node-env';

describe('assertKnownNodeEnv', () => {
  it.each(['development', 'test', 'production'])('does not throw for %s', (env) => {
    expect(() => assertKnownNodeEnv(env)).not.toThrow();
  });

  it('throws when NODE_ENV is undefined', () => {
    expect(() => assertKnownNodeEnv(undefined)).toThrow(/NODE_ENV must be one of/);
  });

  it('throws when NODE_ENV is empty string', () => {
    expect(() => assertKnownNodeEnv('')).toThrow(/NODE_ENV must be one of/);
  });

  it("throws on a typo (e.g. 'produciton') rather than silently treating it as non-production", () => {
    expect(() => assertKnownNodeEnv('produciton')).toThrow(/produciton/);
  });
});
