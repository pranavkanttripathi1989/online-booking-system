import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffResolver } from './staff.resolver';

@Module({
  providers: [StaffService, StaffResolver],
  exports: [StaffService],
})
export class StaffModule {}
