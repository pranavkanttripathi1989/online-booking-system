import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsIn, IsBoolean, IsString } from 'class-validator';

const NOTE_SECTIONS = ['complaints', 'history', 'exam', 'vitals', 'diagnosis', 'investigations', 'advice', 'follow_up'];

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
