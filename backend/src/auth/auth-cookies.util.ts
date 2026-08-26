import { Response } from 'express';

// P1-02/SEC-2 — moves the web session credential out of localStorage (an
// XSS-readable store any injected script can exfiltrate) into an httpOnly
// cookie the frontend's own JS can never read. Names are prefixed 'mb_' so
// they can't collide with anything else on the same origin.
//
// secure:false in non-production is deliberate, not a shortcut: the dev
// stack runs over plain http://localhost (docker-compose.yml), and a
// Secure cookie is silently dropped by the browser over http — the cookie
// would simply never be set, with no error anywhere, exactly the kind of
// silent failure this codebase's own CI/local-parity discipline warns
// against elsewhere. Production (NODE_ENV=production, always https per
// this product's AWS ap-south-1 hosting decision) gets Secure unconditionally.
const isProduction = () => process.env.NODE_ENV === 'production';

export const ACCESS_COOKIE_NAME = 'mb_access_token';
export const REFRESH_COOKIE_NAME = 'mb_refresh_token';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setAccessCookie(res: Response, token: string, maxAgeSeconds: number = ACCESS_TTL_SECONDS): void {
  res.cookie(ACCESS_COOKIE_NAME, token, { ...baseCookieOptions(), maxAge: maxAgeSeconds * 1000 });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseCookieOptions(), maxAge: REFRESH_TTL_SECONDS * 1000 });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, baseCookieOptions());
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}
