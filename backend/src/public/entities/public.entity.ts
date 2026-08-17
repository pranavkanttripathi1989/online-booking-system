import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

// Everything in this file is deliberately a SEPARATE camelCase dialect from
// the canonical snake_case types (ClinicianType, AppointmentType, ...) — see
// backend-api-requirements-master-plan.md §1. `public/landing.jsx`,
// `public/doctor-profile.jsx`, `booking/index.jsx`, and `video/index.jsx` all
// consume this one shared 'getClinician'/'getAppointment'/'getAppointments'
// query surface; each requests a different subset of the same types.

@ObjectType('PublicClinic')
export class PublicClinicType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) address?: string;
}

@ObjectType('PublicLanguage')
export class PublicLanguageType {
  @Field(() => ID) id: string;
  @Field() name: string;
}

@ObjectType('PublicProductVariation')
export class PublicProductVariationType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field(() => Float) price: number;
}

@ObjectType('PublicCancellationRule')
export class PublicCancellationRuleType {
  @Field(() => ID) id: string;
  @Field(() => Int) hoursNoticeRequired: number;
}

@ObjectType('PublicProduct')
export class PublicProductType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Float, { nullable: true }) price?: number;
  @Field({ nullable: true }) product_type?: string;
  @Field(() => [PublicProductVariationType]) variations: PublicProductVariationType[];
  @Field(() => [PublicCancellationRuleType]) cancellation_rules: PublicCancellationRuleType[];
}

// education has no backing model anywhere in the schema — always returns []
// (documented gap, master plan: "entirely new model needed if real").
@ObjectType('PublicEducation')
export class PublicEducationType {
  @Field(() => ID) id: string;
  @Field() degree: string;
  @Field() institution: string;
  @Field(() => Int) year: number;
}

@ObjectType('PublicClinician')
export class PublicClinicianType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) clinicianType?: string;
  @Field({ nullable: true }) bio?: string;
  @Field(() => PublicClinicType, { nullable: true }) clinic?: PublicClinicType;
  @Field(() => [PublicLanguageType]) languages: PublicLanguageType[];
  @Field(() => [PublicProductType]) products: PublicProductType[];
  @Field(() => [PublicEducationType]) education: PublicEducationType[];
}

// public/landing.jsx's search/discovery result — comment in that file names
// the intended real query as `getClinicians`. rating/reviews are computed
// from the Reviews table (now real, next-10-features-implementation-plan.md
// #9); nextAvailable is deliberately omitted (would require running the
// Available Slots algorithm per clinician per search request — expensive for
// a listing endpoint, not built this pass, documented as a follow-up).
@ObjectType('PublicClinicianSummary')
export class PublicClinicianSummaryType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) specialty?: string;
  @Field({ nullable: true }) clinic?: string;
  @Field(() => Float, { nullable: true }) rating?: number;
  @Field(() => Int) reviews: number;
  @Field(() => Float, { nullable: true }) price?: number;
  @Field(() => [String]) languages: string[];
  @Field({ nullable: true }) bio?: string;
  @Field() initials: string;
  @Field() videoEnabled: boolean;
  @Field() verified: boolean;
}

@ObjectType('PublicAppointmentSlot')
export class PublicAppointmentSlotType {
  @Field(() => ID) id: string;
  @Field() startTime: Date;
  @Field() endTime: Date;
}

@ObjectType('PublicAppointmentClinician')
export class PublicAppointmentClinicianType {
  @Field(() => ID) id: string;
  @Field() name: string;
  @Field({ nullable: true }) clinicianType?: string;
}

@ObjectType('PublicAppointmentPatient')
export class PublicAppointmentPatientType {
  @Field(() => ID) id: string;
  @Field() firstName: string;
  @Field() lastName: string;
}

@ObjectType('PublicAppointmentDetail')
export class PublicAppointmentDetailType {
  @Field(() => ID) id: string;
  @Field() startTime: Date;
  @Field() endTime: Date;
  @Field() type: string;
  @Field() status: string;
  @Field(() => PublicAppointmentClinicianType) clinician: PublicAppointmentClinicianType;
  @Field(() => PublicAppointmentPatientType) patient: PublicAppointmentPatientType;
}

@ObjectType('BookedAppointmentResult')
export class BookedAppointmentResultType {
  @Field(() => ID) id: string;
}

@ObjectType('PaymentTransactionResult')
export class PaymentTransactionResultType {
  @Field(() => ID) id: string;
}
