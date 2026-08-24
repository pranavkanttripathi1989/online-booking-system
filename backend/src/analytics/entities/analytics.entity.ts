import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('AppointmentStatsTrends')
export class AppointmentStatsTrendsType {
  @Field(() => Float) totalAppointments: number;
  @Field(() => Float) revenue: number;
  @Field(() => Float) activePatients: number;
  @Field(() => Float) utilization: number;
  @Field(() => Float) cancellationRate: number;
}

@ObjectType('AppointmentTimeSeriesPoint')
export class AppointmentTimeSeriesPointType {
  @Field() date: string;
  @Field(() => Int) scheduled: number;
  @Field(() => Int) completed: number;
  @Field(() => Int) cancelled: number;
}

@ObjectType('AppointmentStatusDistributionPoint')
export class AppointmentStatusDistributionPointType {
  @Field() name: string;
  @Field(() => Int) value: number;
}

@ObjectType('RevenueByClinicPoint')
export class RevenueByClinicPointType {
  @Field() name: string;
  @Field(() => Float) revenue: number;
}

@ObjectType('TopClinicianPoint')
export class TopClinicianPointType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field(() => Int) appointments: number;
  @Field(() => Float) revenue: number;
}

// Backs manager/Dashboard.jsx's GetManagerDashboardData query. `revenue` fields
// are derived from Appointments.product.price (paise) for `completed`
// appointments only, converted to rupees at this resolver boundary
// (backend-hard-rules.md money convention) -- there is no separate per-appointment
// payment/transaction ledger yet (that's the not-yet-built Finances/Billing
// domain, CLAUDE.md Priority 2), so revenue here is "billable value of
// completed appointments", not "captured payments". `utilization` (REQ029,
// US-RPT-01) is real slot-capacity utilisation -- booked minutes ÷ available
// minutes, from ClinicianAvailability windows minus SpacerBlocks/LunchBreaks
// -- computed in AnalyticsService.computeTrueUtilisation(), falling back to
// the old completedAppointments/totalAppointments*100 proxy only when there
// is no availability data in scope to compute a real value from.
@ObjectType('AppointmentStats')
export class AppointmentStatsType {
  @Field(() => Int) totalAppointments: number;
  @Field(() => Float) revenue: number;
  @Field(() => Int) activePatients: number;
  @Field(() => Float) utilization: number;
  @Field(() => Float) cancellationRate: number;
  @Field(() => AppointmentStatsTrendsType) trends: AppointmentStatsTrendsType;
  @Field(() => [AppointmentTimeSeriesPointType]) timeSeriesData: AppointmentTimeSeriesPointType[];
  @Field(() => [AppointmentStatusDistributionPointType]) statusDistribution: AppointmentStatusDistributionPointType[];
  @Field(() => [RevenueByClinicPointType]) revenueByClinic: RevenueByClinicPointType[];
  @Field(() => [TopClinicianPointType]) topClinicians: TopClinicianPointType[];
}
