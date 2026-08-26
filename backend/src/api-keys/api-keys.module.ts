import { Module } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysResolver } from './api-keys.resolver';
import { ApiKeyGuard } from './api-key.guard';
import { PublicApiController } from './public-api.controller';

@Module({
  controllers: [PublicApiController],
  providers: [ApiKeysService, ApiKeysResolver, ApiKeyGuard],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
