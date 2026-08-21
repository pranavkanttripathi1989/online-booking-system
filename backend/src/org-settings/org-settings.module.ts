import { Module } from '@nestjs/common';
import { OrgSettingsService } from './org-settings.service';
import { OrgSettingsResolver } from './org-settings.resolver';
import { OrgBrandingController } from './org-branding.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OrgBrandingController],
  providers: [OrgSettingsService, OrgSettingsResolver],
})
export class OrgSettingsModule {}
