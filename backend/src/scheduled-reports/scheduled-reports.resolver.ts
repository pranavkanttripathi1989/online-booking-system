import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ScheduledReportsService } from './scheduled-reports.service';
import { ScheduledReportType } from './entities/scheduled-report.entity';
import { ScheduledReportInput } from './dto/scheduled-report.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Resolver(() => ScheduledReportType)
export class ScheduledReportsResolver {
  constructor(private readonly scheduledReportsService: ScheduledReportsService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [ScheduledReportType])
  scheduledReports(@CurrentUser() user: JwtPayload) {
    return this.scheduledReportsService.findAll(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ScheduledReportType)
  createScheduledReport(@Args('input') input: ScheduledReportInput, @CurrentUser() user: JwtPayload) {
    return this.scheduledReportsService.create(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => ScheduledReportType)
  deactivateScheduledReport(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: JwtPayload) {
    return this.scheduledReportsService.deactivate(id, user);
  }
}
