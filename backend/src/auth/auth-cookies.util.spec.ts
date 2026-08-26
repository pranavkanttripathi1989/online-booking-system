import { setAccessCookie, setRefreshCookie, clearAuthCookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth-cookies.util';

// P1-02/SEC-2
describe('auth-cookies.util', () => {
  const mockRes = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as any;

  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('sets the access cookie httpOnly, path=/, with the given max age', () => {
    const res = mockRes();
    setAccessCookie(res, 'a.jwt.token', 900);
    expect(res.cookie).toHaveBeenCalledWith(
      ACCESS_COOKIE_NAME,
      'a.jwt.token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 900_000 }),
    );
  });

  it('sets secure:false outside production — a Secure cookie is silently dropped over the dev stack\'s plain http', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    setAccessCookie(res, 'a.jwt.token', 900);
    expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'a.jwt.token', expect.objectContaining({ secure: false }));
  });

  it('sets secure:true in production', () => {
    process.env.NODE_ENV = 'production';
    const res = mockRes();
    setAccessCookie(res, 'a.jwt.token', 900);
    expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, 'a.jwt.token', expect.objectContaining({ secure: true }));
  });

  it('sets the refresh cookie with a 7-day max age', () => {
    const res = mockRes();
    setRefreshCookie(res, 'a-refresh-token');
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'a-refresh-token',
      expect.objectContaining({ maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true }),
    );
  });

  it('clears both cookies with matching options (required for clearCookie to actually remove a cookie set with these options)', () => {
    const res = mockRes();
    clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, expect.objectContaining({ httpOnly: true, path: '/' }));
    expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, expect.objectContaining({ httpOnly: true, path: '/' }));
  });
});
