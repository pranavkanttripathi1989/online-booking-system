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
  // REQ129 (US-RX-08) -- SHA-256 over the prescription's own canonical
  // clinical content, computed once at issue time. Nullable for rows
  // issued before this column existed.
  @Field({ nullable: true }) pdf_hash?: string;
}

// REQ129 (US-RX-08) -- re-derives the hash from the prescription's current
// DB content and compares it to the one stamped at issue time. Always
// `valid: true` today since no update mutation exists on a Prescriptions
// row (issuing IS the sign-off act, no edit path after) -- the mechanism
// this exists to catch is a future edit path, or a direct DB write that
// bypasses the API, not a printed-and-physically-altered paper copy.
@ObjectType('PrescriptionIntegrity')
export class PrescriptionIntegrityType {
  @Field(() => ID) prescription_id: string;
  @Field() valid: boolean;
  @Field({ nullable: true }) stored_hash?: string;
  @Field() computed_hash: string;
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

// REQ109 — {success, userErrors} with no entity to return, matching
// 05-cross-cutting-conventions.md's own explicit guidance for a new
// domain with no consumer yet ("use {success, userErrors} for anything").
@ObjectType('SharePrescriptionUserError')
export class SharePrescriptionUserErrorType {
  @Field() message: string;
}

@ObjectType('SharePrescriptionResult')
export class SharePrescriptionResultType {
  @Field() success: boolean;
  @Field(() => [SharePrescriptionUserErrorType]) userErrors: SharePrescriptionUserErrorType[];
  // Last 2 digits only, e.g. "89" -- enough for the frontend's own
  // confirmation toast ("sent to the number ending in 89") without
  // echoing the full phone number back into the UI unnecessarily.
  @Field({ nullable: true }) phone_last_two?: string;
}
