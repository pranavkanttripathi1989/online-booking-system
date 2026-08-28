import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// BUG035 -- nullable: a metric with no real prior-period baseline to compare
// against has no meaningful percent change (0 -> 12 is not "100%", it's
// undefined) and must not render one. null means "no trend to show", not 0.
@ObjectType('AppointmentStatsTrends')
export class AppointmentStatsTrendsType {
  @Field(() => Float, { nullable: true }) totalAppointments?: number;
  @Field(() => Float, { nullable: true }) revenue?: number;
  @Field(() => Float, { nullable: true }) activePatients?: number;
  @Field(() => Float, { nullable: true }) utilization?: number;
  @Field(() => Float, { nullable: true }) cancellationRate?: number;
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

// REQ029 (US-RPT-02) — new-vs-repeat, acquisition source, and a
// lapsed-patient recall list, over a date range.
@ObjectType('AcquisitionSourcePoint')
export class AcquisitionSourcePointType {
  @Field() source: string;
  @Field(() => Int) count: number;
}

@ObjectType('LapsedPatientPoint')
export class LapsedPatientPointType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
  @Field({ nullable: true }) last_visit?: Date;
}

@ObjectType('PatientReportGroup')
export class PatientReportGroupType {
  @Field(() => Int) newPatients: number;
  @Field(() => Int) repeatPatients: number;
  @Field(() => [AcquisitionSourcePointType]) acquisitionSourceBreakdown: AcquisitionSourcePointType[];
  @Field(() => [LapsedPatientPointType]) lapsedPatients: LapsedPatientPointType[];
}

// P2-04 — denial category counts for claims submitted in the reporting
// window. category is one of denial-classification.ts's own fixed set
// (missing_documentation | coding_mismatch | not_covered |
// authorization_required | duplicate_claim | other); categoryLabel is
// that module's own human-readable label, echoed here so the frontend
// never re-derives its own copy of that lookup table.
@ObjectType('DenialCategoryPoint')
export class DenialCategoryPointType {
  @Field() category: string;
  @Field() categoryLabel: string;
  @Field(() => Int) count: number;
}

// P2-04 — one payer's own claim outcomes over the reporting window.
// avgDecisionDays is null when no claim from this payer has been
// decided yet in range, a legitimate "not enough data" state, not zero.
@ObjectType('PayerScorecard')
export class PayerScorecardType {
  @Field(() => ID) payerId: string;
  @Field() payerName: string;
  @Field(() => Int) totalClaims: number;
  @Field(() => Int) approvedCount: number;
  @Field(() => Int) rejectedCount: number;
  @Field(() => Int) pendingCount: number;
  @Field(() => Float) approvalRate: number;
  @Field(() => Float, { nullable: true }) avgDecisionDays?: number;
  @Field(() => Float) totalClaimAmount: number;
  @Field(() => Float) totalApprovedAmount: number;
  @Field(() => Float) recoveryRate: number;
}

@ObjectType('ClaimAnalytics')
export class ClaimAnalyticsType {
  @Field(() => Int) totalClaims: number;
  @Field(() => Int) approvedCount: number;
  @Field(() => Int) rejectedCount: number;
  @Field(() => Int) settledCount: number;
  @Field(() => Int) pendingCount: number;
  @Field(() => Float) approvalRate: number;
  @Field(() => Float) totalClaimAmount: number;
  @Field(() => Float) totalApprovedAmount: number;
  @Field(() => Float) recoveryRate: number;
  @Field(() => [DenialCategoryPointType]) denialCategoryBreakdown: DenialCategoryPointType[];
  @Field(() => [PayerScorecardType]) payerScorecards: PayerScorecardType[];
}
