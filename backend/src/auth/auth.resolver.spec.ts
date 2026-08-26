import { Test, TestingModule } from '@nestjs/testing';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth-cookies.util';

// P1-02/SEC-2 — the resolver's own job now: turn a service-level token pair
// into an httpOnly cookie, and never let the WS path (no context.res) throw.
describe('AuthResolver — session cookies', () => {
  let resolver: AuthResolver;
  let service: Record<string, jest.Mock>;

  const mockContext = () => ({ req: { headers: {} }, res: { cookie: jest.fn(), clearCookie: jest.fn() } });

  beforeEach(async () => {
    service = {
      login: jest.fn(),
      verifyTotpLogin: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn().mockResolvedValue({ success: true }),
      verifyOtp: jest.fn(),
      startImpersonation: jest.fn(),
      endImpersonation: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthResolver, { provide: AuthService, useValue: service }],
    }).compile();
    resolver = module.get(AuthResolver);
  });

  it('login sets both cookies for a full AuthPayload result', async () => {
    service.login.mockResolvedValue({ access_token: 'a', refresh_token: 'r', expires_in: 900, user: {} });
    const context = mockContext();
    await resolver.login({ email: 'x', password: 'y' } as any, context);
    expect(context.res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'a', expect.anything());
    expect(context.res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'r', expect.anything());
  });

  it('login sets no cookie when the account has 2FA enabled (a TotpChallenge, not a real session yet)', async () => {
    service.login.mockResolvedValue({ requires_totp: true, challenge_token: 'chal' });
    const context = mockContext();
    await resolver.login({ email: 'x', password: 'y' } as any, context);
    expect(context.res.cookie).not.toHaveBeenCalled();
  });

  it('verifyTotpLogin sets cookies once 2FA completes', async () => {
    service.verifyTotpLogin.mockResolvedValue({ access_token: 'a', refresh_token: 'r', expires_in: 900, user: {} });
    const context = mockContext();
    await resolver.verifyTotpLogin({ challenge_token: 'c', code: '123456' } as any, context);
    expect(context.res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'a', expect.anything());
  });

  it('refresh rotates the cookie to the newly issued token pair', async () => {
    service.refresh.mockResolvedValue({ access_token: 'a2', refresh_token: 'r2', expires_in: 900, user: {} });
    const context = mockContext();
    await resolver.refresh({ refresh_token: 'r1' } as any, context);
    expect(context.res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'a2', expect.anything());
    expect(context.res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'r2', expect.anything());
  });

  // P1-02/SEC-2 — apollo/client.js's silent-refresh-on-401 calls this with
  // an empty input and relies entirely on the cookie.
  it('refresh falls back to the mb_refresh_token cookie when the input omits refresh_token', async () => {
    service.refresh.mockResolvedValue({ access_token: 'a2', refresh_token: 'r2', expires_in: 900, user: {} });
    const context = { req: { headers: {}, cookies: { [REFRESH_COOKIE_NAME]: 'cookie-refresh-token' } }, res: { cookie: jest.fn() } };
    await resolver.refresh({} as any, context);
    expect(service.refresh).toHaveBeenCalledWith({ refresh_token: 'cookie-refresh-token' }, undefined);
  });

  it('refresh prefers an explicit input.refresh_token over the cookie', async () => {
    service.refresh.mockResolvedValue({ access_token: 'a2', refresh_token: 'r2', expires_in: 900, user: {} });
    const context = { req: { headers: {}, cookies: { [REFRESH_COOKIE_NAME]: 'cookie-refresh-token' } }, res: { cookie: jest.fn() } };
    await resolver.refresh({ refresh_token: 'explicit-token' } as any, context);
    expect(service.refresh).toHaveBeenCalledWith({ refresh_token: 'explicit-token' }, undefined);
  });

  it('logout clears both cookies regardless of context.res being present', async () => {
    const context = mockContext();
    await resolver.logout({ sub: 'u1' } as any, context);
    expect(context.res.clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, expect.anything());
    expect(context.res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, expect.anything());
  });

  it('logout never throws when context.res is absent (defensive — no mutation here is reached over WS today, but must not assume)', async () => {
    await expect(resolver.logout({ sub: 'u1' } as any, { req: {} })).resolves.toBe(true);
  });

  it('startImpersonation sets only the access cookie, at the impersonation TTL — the refresh cookie must stay the real actor\'s', async () => {
    service.startImpersonation.mockResolvedValue({ success: true, userErrors: [], access_token: 'imp-token', expires_in: 1800 });
    const context = mockContext();
    await resolver.startImpersonation('target-1', 'debugging', { sub: 'admin-1' } as any, context);
    expect(context.res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'imp-token', expect.objectContaining({ maxAge: 1800_000 }));
    expect(context.res.cookie).not.toHaveBeenCalledWith(REFRESH_COOKIE_NAME, expect.anything(), expect.anything());
  });

  it('startImpersonation sets no cookie on failure (blank reason, nonexistent target, etc.)', async () => {
    service.startImpersonation.mockResolvedValue({ success: false, userErrors: [{ message: 'User not found' }] });
    const context = mockContext();
    await resolver.startImpersonation('ghost', 'debugging', { sub: 'admin-1' } as any, context);
    expect(context.res.cookie).not.toHaveBeenCalled();
  });

  it('endImpersonation reissues both cookies from the service\'s internal _tokens, and never leaks _tokens into the returned result', async () => {
    service.endImpersonation.mockResolvedValue({
      success: true,
      userErrors: [],
      _tokens: { access_token: 'real-a', refresh_token: 'real-r', expires_in: 900 },
    });
    const context = mockContext();
    const result = await resolver.endImpersonation({ sub: 'target-1', real_actor_id: 'admin-1' } as any, context);
    expect(context.res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'real-a', expect.anything());
    expect(context.res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'real-r', expect.anything());
    expect(result).not.toHaveProperty('_tokens');
    expect(result).toEqual({ success: true, userErrors: [] });
  });

  it('endImpersonation sets no cookie when not actually impersonating', async () => {
    service.endImpersonation.mockResolvedValue({ success: false, userErrors: [{ message: 'Not currently impersonating' }] });
    const context = mockContext();
    await resolver.endImpersonation({ sub: 'u1' } as any, context);
    expect(context.res.cookie).not.toHaveBeenCalled();
  });
});
