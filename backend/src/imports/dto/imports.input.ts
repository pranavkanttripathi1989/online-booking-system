import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// P2-05 — mirrors column-mapping.ts's own ImportTargetField union.
export const IMPORT_TARGET_FIELDS = [
  'first_name',
  'last_name',
  'full_name',
  'email',
  'phone',
  'gender',
  'address',
  'date_of_birth',
  'medical_notes',
] as const;

@InputType('ImportColumnMappingInput')
export class ImportColumnMappingInput {
  @Field() @IsNotEmpty() sourceColumn: string;
  @Field() @IsIn(IMPORT_TARGET_FIELDS) targetField: string;
}

@InputType('ParseImportPreviewInput')
export class ParseImportPreviewInput {
  @Field() @IsNotEmpty() csvContent: string;
}

@InputType('DryRunImportInput')
export class DryRunImportInput {
  @Field() @IsNotEmpty() csvContent: string;
  @Field(() => [ImportColumnMappingInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportColumnMappingInput)
  mapping: ImportColumnMappingInput[];
}

@InputType('CommitImportInput')
export class CommitImportInput {
  @Field() @IsNotEmpty() csvContent: string;
  @Field(() => [ImportColumnMappingInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportColumnMappingInput)
  mapping: ImportColumnMappingInput[];
}
