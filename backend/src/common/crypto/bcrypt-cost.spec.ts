/**
 * Pins the production bcrypt work factor.
 *
 * F-29 made BCRYPT_COST configurable so the unit suite could stop timing out on
 * real hashes. That is a security parameter, so the escape hatch needs a guard:
 * these tests exist so "make the tests faster" can never quietly become "make
 * production passwords cheaper to crack".
 */
describe('BCRYPT_COST', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
    jest.resetModules();
  });

  function load() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./bcrypt-cost');
  }

  it('defaults to 12 when nothing is configured', () => {
    delete process.env.BCRYPT_COST;
    jest.resetModules();
    const { BCRYPT_COST, BCRYPT_PRODUCTION_COST } = load();
    expect(BCRYPT_COST).toBe(12);
    expect(BCRYPT_PRODUCTION_COST).toBe(12);
  });

  it('honours a lower cost outside production, which is what the test suite relies on', () => {
    process.env.BCRYPT_COST = '4';
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    expect(load().BCRYPT_COST).toBe(4);
  });

  it('REFUSES a below-minimum cost in production rather than silently accepting it', () => {
    process.env.BCRYPT_COST = '4';
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    expect(() => load()).toThrow(/below the production minimum/);
  });

  it('allows a stronger-than-default cost in production', () => {
    process.env.BCRYPT_COST = '14';
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    expect(load().BCRYPT_COST).toBe(14);
  });

  it('rejects a malformed value instead of coercing it', () => {
    process.env.BCRYPT_COST = 'twelve';
    jest.resetModules();
    expect(() => load()).toThrow(/must be an integer/);
  });
});
