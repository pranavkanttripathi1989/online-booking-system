import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeysService } from './api-keys.service';

// REQ116 — the guard is the actual enforcement point: a missing/invalid/
// revoked key must reject before the controller (and its Prisma query)
// ever runs, and a valid key must attach the org id resolved from the
// key itself, never something a caller could supply.
describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let apiKeysService: { verify: jest.Mock };

  beforeEach(() => {
    apiKeysService = { verify: jest.fn() };
    guard = new ApiKeyGuard(apiKeysService as unknown as ApiKeysService);
  });

  function contextWithHeaders(headers: Record<string, string | string[] | undefined>): ExecutionContext {
    const req: any = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  }

  it('rejects a request with no X-API-Key header', async () => {
    const ctx = contextWithHeaders({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(apiKeysService.verify).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid or revoked key', async () => {
    apiKeysService.verify.mockResolvedValue(null);
    const ctx = contextWithHeaders({ 'x-api-key': 'mbk_bad.value' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the org id resolved from the key, activates on success', async () => {
    apiKeysService.verify.mockResolvedValue({ client_org_id: 'org-a' });
    const req: any = { headers: { 'x-api-key': 'mbk_abc.raw' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.apiKeyOrgId).toBe('org-a');
    expect(apiKeysService.verify).toHaveBeenCalledWith('mbk_abc.raw');
  });
});
