import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('EncounterNote')
export class EncounterNoteType {
  @Field(() => ID) id: string;
  @Field() section: string;
  @Field() content: string;
  @Field(() => Int) version: number;
  @Field() updated_at: Date;
}

@ObjectType('EncounterAddendum')
export class EncounterAddendumType {
  @Field(() => ID) id: string;
  @Field(() => ID) author_id: string;
  @Field() content: string;
  @Field({ nullable: true }) reason?: string;
  @Field() created_at: Date;
}

// Also backs the allergy banner (type='allergy'). No real ICD-10 coding
// this slice (P1) -- icd10_code is free-text-fallback-nullable.
@ObjectType('Diagnosis')
export class DiagnosisType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field() type: string;
  @Field({ nullable: true }) icd10_code?: string;
  @Field({ nullable: true }) procedure_code?: string;
  @Field() text: string;
  @Field() status: string;
  @Field() created_at: Date;
}

// REQ127 (FR-EMR-08) — the row is really a TestResults record (an order
// and its eventual result are the same row at different lifecycle
// points), but exposed here as its own lightweight type rather than
// importing TestResultType across modules -- matches this codebase's own
// established convention (see TimelineEventType below, which does the
// same flattening for cross-domain data rather than a cross-module type
// import).
@ObjectType('InvestigationOrder')
export class InvestigationOrderType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field() test_name: string;
  @Field() test_type: string;
  @Field() urgency: string;
  @Field() status: string;
  @Field() date_ordered: Date;
}

// REQ128 (FR-EMR-10) — a clinician referring a patient onward to another
// specialty/clinician, authored from within a consultation. Its own real
// dedicated table (unlike InvestigationOrderType above, which reuses
// TestResults) since a referral has no pre-existing sibling concept to
// share a lifecycle with.
@ObjectType('Referral')
export class ReferralType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field() referred_to_specialty: string;
  @Field(() => ID, { nullable: true }) referred_to_clinician_id?: string;
  @Field() reason: string;
  @Field() urgency: string;
  @Field() status: string;
  @Field() created_at: Date;
}

// REQ130 (FR-EMR-05) — one discrete vital-sign reading. `code` is one of a
// fixed set (see VITAL_CODES in dto/encounter.input.ts); a growth chart
// queries a single code across every encounter for a patient
// (EncountersService#patientVitals), which is exactly what this shape
// exists to make cheap.
@ObjectType('Vital')
export class VitalType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field() code: string;
  @Field(() => Float) value: number;
  @Field() unit: string;
  @Field() recorded_at: Date;
}

@ObjectType('EncounterAttachment')
export class AttachmentType {
  @Field(() => ID) id: string;
  @Field() file_ref: string;
  @Field() mime_type: string;
  @Field() original_filename: string;
  @Field(() => ID) uploaded_by_id: string;
  @Field() created_at: Date;
}

@ObjectType('Encounter')
export class EncounterType {
  @Field(() => ID) id: string;
  @Field(() => ID) appointment_id: string;
  @Field(() => ID) patient_id: string;
  @Field(() => ID) clinician_id: string;
  @Field() status: string;
  @Field() locked: boolean;
  // REQ026 (P1-16, US-TEL-05) — denormalized from Appointments.type at
  // creation; prescriptions.service.ts's TPG guard reads this directly.
  @Field() consultation_mode: string;
  @Field({ nullable: true }) signed_at?: Date;
  @Field(() => ID, { nullable: true }) signed_by_id?: string;
  @Field() created_at: Date;
  @Field() updated_at: Date;
  @Field(() => [EncounterNoteType]) notes: EncounterNoteType[];
  @Field(() => [EncounterAddendumType]) addenda: EncounterAddendumType[];
  @Field(() => [DiagnosisType]) diagnoses: DiagnosisType[];
  @Field(() => [AttachmentType]) attachments: AttachmentType[];
  @Field(() => [InvestigationOrderType]) investigation_orders: InvestigationOrderType[];
  @Field(() => [ReferralType]) referrals: ReferralType[];
  @Field(() => [VitalType]) vitals: VitalType[];
}

@ObjectType('EncounterTemplate')
export class EncounterTemplateType {
  @Field(() => ID) id: string;
  @Field(() => ID, { nullable: true }) clinician_id?: string;
  @Field({ nullable: true }) specialty?: string;
  @Field() name: string;
  // JSON-stringified { [section]: defaultContent } -- see CreateEncounterTemplateInput.
  @Field() sections_json: string;
}

// Patient timeline (US-EMR-07): one chronological, typed feed of Encounters,
// Diagnoses/allergies, Attachments, and real TestResults. Messages/
// prescriptions are out of scope this slice (REQ020's own plan) --
// prescriptions don't exist until REQ021.
@ObjectType('TimelineEvent')
export class TimelineEventType {
  @Field(() => ID) id: string;
  @Field() type: string; // encounter | diagnosis | allergy | attachment | test_result
  @Field() date: Date;
  @Field() title: string;
  @Field({ nullable: true }) summary?: string;
  @Field(() => ID, { nullable: true }) encounter_id?: string;
}
