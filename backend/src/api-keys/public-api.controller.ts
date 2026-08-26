import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard, ApiKeyRequest } from './api-key.guard';
import { ApiKeysService } from './api-keys.service';

// REQ116 — the first real REST endpoint gated by ApiKeyGuard. Plain REST,
// not GraphQL, matching documents.controller.ts's own precedent: an
// external partner integration is exactly the kind of caller this
// codebase's two GraphQL dialects were never designed for. Excluded from
// matrix-coverage.int-spec.ts for the same structural reason documented on
// DocumentsController/AttachmentsController/OrgBrandingController — that
// suite only ever drives GraphQL operations.
@Controller('api/v1')
export class PublicApiController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get('appointments')
  @UseGuards(ApiKeyGuard)
  async appointments(@Req() req: ApiKeyRequest, @Query('date') date?: string) {
    return this.apiKeysService.listAppointmentsForOrg(req.apiKeyOrgId as string, date);
  }
}
