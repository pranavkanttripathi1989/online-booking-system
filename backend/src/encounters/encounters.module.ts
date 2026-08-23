import { Module } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { EncountersResolver } from './encounters.resolver';
import { AttachmentsController } from './attachments.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AttachmentsController],
  providers: [EncountersService, EncountersResolver],
})
export class EncountersModule {}
