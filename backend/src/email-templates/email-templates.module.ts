import { Module } from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesResolver } from './email-templates.resolver';

@Module({
  providers: [EmailTemplatesService, EmailTemplatesResolver],
})
export class EmailTemplatesModule {}
