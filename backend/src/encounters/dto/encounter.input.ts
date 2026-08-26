import { InputType, Field, ID, Float } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsString, IsNumber, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const NOTE_SECTIONS = ['complaints', 'history', 'exam', 'vitals', 'diagnosis', 'investigations', 'advice', 'follow_up'];

// REQ130 (FR-EMR-05) -- fixed set of discrete vital-sign codes, matching
// the requirement's own Data Model Impact section's code/value/unit shape.
export const VITAL_CODES = ['height_cm', 'weight_kg', 'temperature_c', 'pulse_bpm', 'bp_systolic', 'bp_diastolic', 'spo2_percent'] as const;
// Server-derived, never client-supplied -- see VitalReadingInput below.
export const VITAL_UNITS: Record<(typeof VITAL_CODES)[number], string> = {
  height_cm: 'cm',
  weight_kg: 'kg',
  temperature_c: '°C',
  pulse_bpm: 'bpm',
  bp_systolic: 'mmHg',
  bp_diastolic: 'mmHg',
  spo2_percent: '%',
};

@InputType()
export class SaveEncounterNoteInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field()
  @IsIn(NOTE_SECTIONS)
  section: string;

  // Global ValidationPipe is {whitelist: true, forbidNonWhitelisted: true} --
  // class-validator treats an undecorated property as unrecognized and
  // strips/rejects it. @IsString() (not @IsNotEmpty()) since clearing a
  // section back to empty is a legitimate save. Found live: every
  // saveEncounterNote call 400'd with "property content should not exist"
  // before this was added, and the frontend swallowed the error silently --
  // a clinician's typed note looked saved and was actually lost on reload.
  @Field()
  @IsString()
  content: string;
}

@InputType()
export class AddAddendumInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field()
  @IsNotEmpty()
  content: string;

  @Field({ nullable: true })
  @IsOptional()
  reason?: string;
}

@InputType()
export class CreateDiagnosisInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['diagnosis', 'allergy'])
  type?: string;

  // No real ICD-10 coding this slice (P1, per REQ020's own phase split) --
  // free text only.
  @Field({ nullable: true })
  @IsOptional()
  icd10_code?: string;

  @Field()
  @IsNotEmpty()
  text: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['active', 'resolved'])
  status?: string;
}

// REQ127 (FR-EMR-08)
@InputType()
export class OrderInvestigationInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field()
  @IsNotEmpty()
  test_name: string;

  @Field()
  @IsNotEmpty()
  test_type: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['routine', 'urgent', 'stat'])
  urgency?: string;
}

// REQ128 (FR-EMR-10)
@InputType()
export class CreateReferralInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field()
  @IsNotEmpty()
  referred_to_specialty: string;

  // Validated against the caller's own org before write (Hard Rule 6) --
  // see EncountersService#createReferral.
  @Field(() => ID, { nullable: true })
  @IsOptional()
  referred_to_clinician_id?: string;

  @Field()
  @IsNotEmpty()
  reason: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsIn(['routine', 'urgent'])
  urgency?: string;
}

// REQ135 -- referral status-transition, matching Referrals.status'
// existing valid values verbatim (REQ128's own schema comment).
export const REFERRAL_STATUSES = ['pending', 'scheduled', 'completed', 'declined'] as const;

@InputType()
export class UpdateReferralStatusInput {
  @Field() @IsIn(REFERRAL_STATUSES) status: string;
}

// REQ130 (FR-EMR-05) -- no client-supplied unit: EncountersService derives
// it from code via a fixed map (VITAL_UNITS), so a growth chart can never
// end up with mixed units (e.g. 'kg' vs 'Kg' vs 'kilograms') for the same
// code from an inconsistent client.
@InputType()
export class VitalReadingInput {
  @Field()
  @IsIn(VITAL_CODES)
  code: string;

  @Field(() => Float)
  @IsNumber()
  value: number;
}

@InputType()
export class RecordVitalsInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field(() => [VitalReadingInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VitalReadingInput)
  readings: VitalReadingInput[];
}

@InputType()
export class CreateEncounterTemplateInput {
  @Field({ nullable: true })
  @IsOptional()
  specialty?: string;

  @Field()
  @IsNotEmpty()
  name: string;

  // JSON-stringified { [section]: defaultContent } -- no GraphQL JSON scalar
  // dependency exists in this codebase yet, so this mirrors how other Json
  // columns (e.g. UserProfiles.address_structured) already cross the
  // resolver boundary as a plain scalar rather than adding one for a single field.
  @Field()
  @IsNotEmpty()
  sections_json: string;

  // true = org-shared (clinician_id null on the row); false/omitted = a
  // personal favourite owned by the calling clinician.
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  org_shared?: boolean;
}

@InputType()
export class ApplyTemplateInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field(() => ID)
  @IsNotEmpty()
  template_id: string;
}

@InputType()
export class CreateAttachmentInput {
  @Field(() => ID)
  @IsNotEmpty()
  encounter_id: string;

  @Field()
  @IsNotEmpty()
  file_ref: string;

  @Field()
  @IsNotEmpty()
  mime_type: string;

  @Field()
  @IsNotEmpty()
  original_filename: string;
}
