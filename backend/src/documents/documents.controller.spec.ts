import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ACCESS_COOKIE_NAME } from '../auth/auth-cookies.util';

// P1-02/SEC-2 — authenticate() gained a cookie-first fallback so a real
// browser download (fetch with credentials:'include') no longer needs a
// bearer token in JS; the Bearer header must still work unchanged for any
// non-browser caller.
describe('DocumentsController — authenticate()', () => {
  let controller: DocumentsController;
  let jwtService: { verifyAsync: jest.Mock };

  beforeEach(async () => {
    jwtService = { verifyAsync: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsController,
        { provide: DocumentsService, useValue: {} },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    controller = module.get(DocumentsController);
  });

  const authenticate = (req: any) => (controller as any).authenticate(req);

  it('accepts the httpOnly cookie when present, without needing a Bearer header at all', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    const payload = await authenticate({ cookies: { [ACCESS_COOKIE_NAME]: 'cookie-token' }, headers: {} });
    expect(payload).toEqual({ sub: 'user-1' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('cookie-token');
  });

  it('falls back to the Bearer header when no cookie is present (non-browser caller)', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    const payload = await authenticate({ cookies: {}, headers: { authorization: 'Bearer header-token' } });
    expect(payload).toEqual({ sub: 'user-1' });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('header-token');
  });

  it('prefers the cookie over a simultaneously-present Bearer header', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    await authenticate({ cookies: { [ACCESS_COOKIE_NAME]: 'cookie-token' }, headers: { authorization: 'Bearer header-token' } });
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('cookie-token');
  });

  it('rejects when neither a cookie nor a Bearer header is present', async () => {
    await expect(authenticate({ cookies: {}, headers: {} })).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects an invalid/expired token with a clean UnauthorizedException, not a raw jwt error', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    await expect(authenticate({ cookies: { [ACCESS_COOKIE_NAME]: 'stale' }, headers: {} })).rejects.toThrow(UnauthorizedException);
  });
});
