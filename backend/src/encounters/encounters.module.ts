import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersResolver } from './encounters.resolver';
import { AttachmentsController } from './attachments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AttachmentsController],
  providers: [EncountersService, EncountersResolver],
  // REQ057 — documents.module.ts reuses encounter() rather than
  // re-deriving the same org/self-scoping.
  exports: [EncountersService],
})
export class EncountersModule {}
