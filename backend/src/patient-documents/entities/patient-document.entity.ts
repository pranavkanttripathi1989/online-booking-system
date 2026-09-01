import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

// REQ174 — canonical (snake_case) dialect, matching drugs/prescriptions'
// own entities; no pre-existing frontend contract to match (the
// patients/detail.jsx Documents tab was previously local-state-only).
@ObjectType('PatientDocument')
export class PatientDocumentType {
  @Field(() => ID) id: string;
  @Field(() => ID) patient_id: string;
  @Field() category: string;
  @Field() file_ref: string;
  @Field() mime_type: string;
  @Field() original_filename: string;
  @Field(() => Int) file_size_bytes: number;
  @Field(() => ID) uploaded_by_id: string;
  @Field() created_at: Date;
}
