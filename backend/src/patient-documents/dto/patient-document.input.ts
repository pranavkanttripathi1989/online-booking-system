import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsIn, IsInt, Min } from 'class-validator';

// REQ174 — mirrors the frontend's existing (previously local-state-only)
// DOCUMENT_FOLDERS taxonomy verbatim; kept in sync manually, same as
// DrugInput.tpg_list's own small, UI-owned closed list.
export const PATIENT_DOCUMENT_CATEGORIES = ['General', 'Lab Reports', 'Prescriptions', 'Imaging', 'Consent Forms'] as const;

@InputType('CreatePatientDocumentInput')
export class CreatePatientDocumentInput {
  @Field(() => ID) @IsNotEmpty() patient_id: string;
  @Field() @IsIn(PATIENT_DOCUMENT_CATEGORIES) category: string;
  @Field() @IsNotEmpty() @IsString() file_ref: string;
  @Field() @IsNotEmpty() @IsString() mime_type: string;
  @Field() @IsNotEmpty() @IsString() original_filename: string;
  @Field(() => Int) @IsInt() @Min(1) file_size_bytes: number;
}
