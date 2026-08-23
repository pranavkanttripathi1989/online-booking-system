import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('PrescriptionItem')
export class PrescriptionItemType {
  @Field(() => ID) id: string;
  @Field(() => ID) drug_id: string;
  @Field() drug_name: string;
  @Field() dose: string;
  @Field() frequency: string;
  @Field({ nullable: true }) route?: string;
  @Field(() => Int, { nullable: true }) duration_days?: number;
  @Field(() => Int, { nullable: true }) qty?: number;
  @Field({ nullable: true }) instructions?: string;
  @Field() substitutable: boolean;
}

@ObjectType('Prescription')
export class PrescriptionType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field(() => ID) patient_id: string;
  @Field(() => ID) clinician_id: string;
  @Field() mode: string;
  @Field() issued_at: Date;
  @Field() language: string;
  @Field(() => ID, { nullable: true }) repeated_from_id?: string;
  @Field(() => [PrescriptionItemType]) items: PrescriptionItemType[];
}

// Draft shape returned by repeatPrescription() -- pre-filled items for
// review/adjustment, not yet a persisted Prescriptions row (US-RX-05's own
// "pre-populate for review and adjustment", not a silent copy).
@ObjectType('PrescriptionDraft')
export class PrescriptionDraftType {
  @Field(() => ID) repeated_from_id: string;
  @Field(() => [PrescriptionItemType]) items: PrescriptionItemType[];
}

@ObjectType('PrescriptionSetItem')
export class PrescriptionSetItemType {
  @Field(() => ID) id: string;
  @Field(() => ID) drug_id: string;
  @Field() drug_name: string;
  @Field() dose: string;
  @Field() frequency: string;
  @Field({ nullable: true }) route?: string;
  @Field(() => Int, { nullable: true }) duration_days?: number;
  @Field({ nullable: true }) instructions?: string;
}

@ObjectType('PrescriptionSet')
export class PrescriptionSetType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) clinician_id?: string;
  @Field({ nullable: true }) specialty?: string;
  @Field() name: string;
  @Field(() => [PrescriptionSetItemType]) items: PrescriptionSetItemType[];
}

// Letterhead + one-call payload for the print view (US-RX-03) -- avoids the
// print page needing 4 separate queries.
@ObjectType('PrescriptionPrintClinic')
export class PrescriptionPrintClinicType {
  @Field() name: string;
  @Field({ nullable: true }) logo_url?: string;
  @Field({ nullable: true }) contact_phone?: string;
  @Field({ nullable: true }) address?: string;
}

@ObjectType('PrescriptionPrintClinician')
export class PrescriptionPrintClinicianType {
  @Field() full_name: string;
  @Field({ nullable: true }) registration_number?: string;
  @Field({ nullable: true }) qualifications?: string;
}

@ObjectType('PrescriptionPrintPatient')
export class PrescriptionPrintPatientType {
  @Field() full_name: string;
  @Field() date_of_birth: Date;
  @Field({ nullable: true }) gender?: string;
}

@ObjectType('PrescriptionPrintPayload')
export class PrescriptionPrintPayloadType {
  @Field(() => PrescriptionType) prescription: PrescriptionType;
  @Field(() => PrescriptionPrintClinicType) clinic: PrescriptionPrintClinicType;
  @Field(() => PrescriptionPrintClinicianType) clinician: PrescriptionPrintClinicianType;
  @Field(() => PrescriptionPrintPatientType) patient: PrescriptionPrintPatientType;
  // true from the second fetch onward -- the frontend renders a
  // "DUPLICATE" watermark when this is true, never on the first (original)
  // print.
  @Field() is_reprint: boolean;
}
