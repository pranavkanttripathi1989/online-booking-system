import { Resolver, Query, Args, ID, Int } from '@nestjs/graphql';
import { AnalyticsService } from './analytics.service';
import { ClinicType } from '../clinics/entities/clinic.entity';
import { AppointmentStatsType, PatientReportGroupType } from './entities/analytics.entity';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// manager/Dashboard.jsx's real GetManagerDashboardData contract
// (context/frontend-integration-audit.md Dashboard-aggregation item) --
// getX-prefixed/camelCase, matched verbatim to that page's own inline gql
// rather than the canonical snake_case dialect, since this query was never
// live before and has no other consumer to stay consistent with.
@Resolver()
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => [ClinicType])
  getClinics(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getClinics(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => AppointmentStatsType)
  getAppointmentStats(
    @Args('clinicId', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analyticsService.getAppointmentStats(clinicId ?? undefined, startDate, endDate, user);
  }

  // REQ029 (US-RPT-02).
  @Auth('manager', 'admin', 'super_admin')
  @Query(() => PatientReportGroupType)
  getPatientReportGroup(
    @Args('clinicId', { type: () => ID, nullable: true }) clinicId: string | undefined,
    @Args('startDate') startDate: string,
    @Args('endDate') endDate: string,
    @Args('lapsedLookbackDays', { type: () => Int, defaultValue: 90 }) lapsedLookbackDays: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.analyticsService.getPatientReportGroup(clinicId ?? undefined, startDate, endDate, lapsedLookbackDays, user);
  }
}
