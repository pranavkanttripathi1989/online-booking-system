import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RevenueShareService } from './revenue-share.service';
import { RevenueShareResolver } from './revenue-share.resolver';

@Module({
  imports: [PrismaModule],
  providers: [RevenueShareService, RevenueShareResolver],
})
export class RevenueShareModule {}
