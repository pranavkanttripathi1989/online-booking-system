import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

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
  @Field() text: string;
  @Field() status: string;
  @Field() created_at: Date;
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
  @Field({ nullable: true }) signed_at?: Date;
  @Field(() => ID, { nullable: true }) signed_by_id?: string;
  @Field() created_at: Date;
  @Field() updated_at: Date;
  @Field(() => [EncounterNoteType]) notes: EncounterNoteType[];
  @Field(() => [EncounterAddendumType]) addenda: EncounterAddendumType[];
  @Field(() => [DiagnosisType]) diagnoses: DiagnosisType[];
  @Field(() => [AttachmentType]) attachments: AttachmentType[];
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
