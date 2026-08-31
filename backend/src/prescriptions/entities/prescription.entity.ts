import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

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
  // REQ171 -- Drugs.composition, already modelled, never exposed here
  // before this slice. A combination drug's own composition line, shown
  // under the dose/frequency line on the printed prescription.
  @Field({ nullable: true }) composition?: string;
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
  // REQ170 -- the rest of the letterhead footer. tagline/primary_color/
  // secondary_color are sourced from ClientOrganizations (org-wide
  // branding), folded into this same "clinic" type for the frontend's
  // convenience -- matching how logo_url already blends the two sources
  // here. website/alternate_phone/appointment_note/email are sourced from
  // the specific Clinics row the appointment actually happened at (not
  // the org), correcting the pre-REQ170 bug where every branch of a
  // multi-clinic org rendered the same org-wide phone/address.
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) website?: string;
  @Field({ nullable: true }) alternate_phone?: string;
  @Field({ nullable: true }) appointment_note?: string;
  @Field({ nullable: true }) tagline?: string;
  @Field({ nullable: true }) primary_color?: string;
  @Field({ nullable: true }) secondary_color?: string;
}

@ObjectType('PrescriptionPrintClinician')
export class PrescriptionPrintClinicianType {
  @Field() full_name: string;
  @Field({ nullable: true }) registration_number?: string;
  @Field({ nullable: true }) qualifications?: string;
}

// REQ170 -- one letterhead header block. `doctors` on the print payload
// below always has at least one entry (the issuing clinician, when the
// clinic never configured letterhead_clinician_ids) -- distinct from
// `clinician` above, which is specifically "who issued/signed THIS
// prescription", a real clinical/legal fact kept next to the signature
// regardless of who else is co-branded on the letterhead.
@ObjectType('PrescriptionLetterheadDoctor')
export class PrescriptionLetterheadDoctorType {
  @Field() full_name: string;
  @Field({ nullable: true }) qualifications?: string;
  @Field({ nullable: true }) specialty_highlights?: string;
  @Field({ nullable: true }) registration_number?: string;
}

@ObjectType('PrescriptionPrintPatient')
export class PrescriptionPrintPatientType {
  @Field() full_name: string;
  @Field() date_of_birth: Date;
  @Field({ nullable: true }) gender?: string;
}

// REQ171 -- the same encounter's own clinical narrative (already fully
// modelled on Encounters/EncounterNotes/Diagnoses/Vitals, just never
// joined into a prescription's own print payload before this slice).
// Every field nullable: a specialty/clinician that never records one of
// these keeps today's clean layout, no empty labels rendered.
@ObjectType('PrescriptionEncounterContext')
export class PrescriptionEncounterContextType {
  @Field({ nullable: true }) complaints?: string;
  @Field({ nullable: true }) exam?: string;
  @Field({ nullable: true }) diagnosis?: string;
  @Field({ nullable: true }) advice?: string;
  @Field({ nullable: true }) follow_up?: string;
  @Field({ nullable: true }) investigations?: string;
  @Field(() => Float, { nullable: true }) bp_systolic?: number;
  @Field(() => Float, { nullable: true }) bp_diastolic?: number;
  @Field(() => Float, { nullable: true }) height_cm?: number;
  @Field(() => Float, { nullable: true }) weight_kg?: number;
  @Field(() => Float, { nullable: true }) bmi?: number;
  // REQ172 -- obstetric-specific, all three null together whenever
  // Encounters.lmp_date was never set. EDD/gestational age are always
  // computed from lmp_date at read time (obstetric-dates.ts) -- never
  // their own stored columns.
  @Field({ nullable: true }) lmp_date?: Date;
  @Field({ nullable: true }) edd?: Date;
  @Field(() => Int, { nullable: true }) gestational_age_weeks?: number;
  @Field(() => Int, { nullable: true }) gestational_age_days?: number;
}

@ObjectType('PrescriptionPrintPayload')
export class PrescriptionPrintPayloadType {
  @Field(() => PrescriptionType) prescription: PrescriptionType;
  @Field(() => PrescriptionPrintClinicType) clinic: PrescriptionPrintClinicType;
  @Field(() => PrescriptionPrintClinicianType) clinician: PrescriptionPrintClinicianType;
  @Field(() => [PrescriptionLetterheadDoctorType]) doctors: PrescriptionLetterheadDoctorType[];
  @Field(() => PrescriptionPrintPatientType) patient: PrescriptionPrintPatientType;
  @Field(() => PrescriptionEncounterContextType, { nullable: true }) encounter_context?: PrescriptionEncounterContextType;
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
