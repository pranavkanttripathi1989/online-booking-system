import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// Minimal refs — not the canonical PatientType/ClinicianType/ServiceType,
// which carry many more fields this lightweight aggregation query has no
// use for. Matches the same "own slim type" pattern already used elsewhere
// (see backend-api-requirements-master-plan.md's entity-shape notes).
@ObjectType('DashboardAppointmentPatient')
export class DashboardAppointmentPatientType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
}

@ObjectType('DashboardClinicianTypeRef')
export class DashboardClinicianTypeRefType {
  @Field() name: string;
}

@ObjectType('DashboardAppointmentClinician')
export class DashboardAppointmentClinicianType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
}

@ObjectType('DashboardAppointmentService')
export class DashboardAppointmentServiceType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('DashboardUpcomingAppointment')
export class DashboardUpcomingAppointmentType {
  @Field(() => ID) id: string;
  @Field() start_datetime: Date;
  @Field() end_datetime: Date;
  @Field() status: string;
  @Field(() => DashboardAppointmentPatientType) patient: DashboardAppointmentPatientType;
  @Field(() => DashboardAppointmentClinicianType) clinician: DashboardAppointmentClinicianType;
  @Field(() => DashboardAppointmentServiceType, { nullable: true }) service?: DashboardAppointmentServiceType;
}

@ObjectType('DashboardUtilisationClinician')
export class DashboardUtilisationClinicianType {
  @Field(() => ID) id: string;
  @Field() full_name: string;
  @Field({ nullable: true }) avatar_url?: string;
  @Field(() => DashboardClinicianTypeRefType, { nullable: true }) clinician_type?: DashboardClinicianTypeRefType;
}

// slots_available is a real (not fabricated) count derived from
// ClinicianAvailability, but a deliberately simplified one — see
// dashboard.service.ts's getUtilisationByClinician() for exactly what's
// included/excluded, matching the same simplification analytics.entity.ts
// already documents for its own utilisation proxy.
@ObjectType('DashboardClinicianUtilisation')
export class DashboardClinicianUtilisationType {
  @Field(() => DashboardUtilisationClinicianType) clinician: DashboardUtilisationClinicianType;
  @Field(() => Int) slots_available: number;
  @Field(() => Int) slots_booked: number;
  @Field(() => Float) utilisation_percent: number;
}

@ObjectType('DashboardVolumeByDay')
export class DashboardVolumeByDayType {
  @Field() date: string;
  @Field(() => Int) confirmed_count: number;
  @Field(() => Int) cancelled_count: number;
}

@ObjectType('DashboardBookingsByService')
export class DashboardBookingsByServiceType {
  @Field() service_name: string;
  @Field(() => Int) count: number;
}

// Backs frontend/src/pages/dashboard/index.jsx's DASHBOARD_QUERY (admin/
// super_admin/staff only — App.jsx's RoleGuard on /dashboard). See REQ007/
// PLAN014 for the revenue-metric-vs-analytics.service.ts distinction and
// the utilisation-proxy simplification.
@ObjectType('Dashboard')
export class DashboardType {
  @Field(() => Int) total_appointments_today: number;
  // BUG042 -- nullable, same fix as BUG035's analytics.service.ts sibling:
  // no real prior-period baseline means no real percent change to report.
  @Field(() => Float, { nullable: true }) total_appointments_today_change?: number;
  @Field(() => Int) total_appointments_week: number;
  @Field(() => Int) total_appointments_month: number;
  @Field(() => Int) total_clinicians: number;
  @Field(() => Float, { nullable: true }) total_clinicians_change?: number;
  @Field(() => Int) total_patients: number;
  @Field(() => Float, { nullable: true }) total_patients_change?: number;
  @Field(() => Float) total_revenue_month: number;
  @Field(() => Float, { nullable: true }) total_revenue_month_change?: number;
  @Field(() => Float) no_show_rate: number;
  @Field(() => [DashboardUpcomingAppointmentType]) upcoming_appointments: DashboardUpcomingAppointmentType[];
  @Field(() => [DashboardClinicianUtilisationType]) utilisation_by_clinician: DashboardClinicianUtilisationType[];
  @Field(() => [DashboardVolumeByDayType]) volume_by_day: DashboardVolumeByDayType[];
  @Field(() => [DashboardBookingsByServiceType]) bookings_by_service: DashboardBookingsByServiceType[];
}
