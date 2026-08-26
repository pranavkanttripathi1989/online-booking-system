import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeysService } from './api-keys.service';

// REQ116 — the first real consumer of ApiKeysService#verify(). REQ015
// shipped issuance/revocation/hashing but left it deliberately unwired:
// "no public API exists to authenticate into yet". Reads X-API-Key,
// verifies fresh against the bcrypt-hashed table on every request (no
// caching of validity — REQ015's own US-SEC-08 acceptance criterion,
// "stops working within one request cycle"), and attaches the resolved
// org id to the request for a controller to scope its own query by —
// the same "guard resolves identity, service enforces scope" split as
// GqlAuthGuard/RolesGuard already use for the JWT path.
export type ApiKeyRequest = Request & { apiKeyOrgId?: string };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ApiKeyRequest>();
    const rawKey = req.headers['x-api-key'];
    if (!rawKey || Array.isArray(rawKey)) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }
    const result = await this.apiKeysService.verify(rawKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }
    req.apiKeyOrgId = result.client_org_id;
    return true;
  }
}
