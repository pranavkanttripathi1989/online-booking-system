import { Module } from '@nestjs/common';
import { OrgSettingsService } from './org-settings.service';
import { OrgSettingsResolver } from './org-settings.resolver';

@Module({
  providers: [OrgSettingsService, OrgSettingsResolver],
})
export class OrgSettingsModule {}
