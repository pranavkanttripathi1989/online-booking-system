import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType('SuggestedColumnMapping')
export class SuggestedColumnMappingType {
  @Field() sourceColumn: string;
  @Field({ nullable: true }) targetField?: string;
}

// A GraphQL list field can't be nested ([[String]]) as cleanly as a
// wrapped row type -- one field holding this row's own ordered cell
// values, aligned to ImportPreviewType.headers by index.
@ObjectType('ImportSampleRow')
export class ImportSampleRowType {
  @Field(() => [String]) values: string[];
}

@ObjectType('ImportPreview')
export class ImportPreviewType {
  @Field(() => [String]) headers: string[];
  // First few rows only, for the mapping-review screen -- never the
  // whole file (a real export can be thousands of rows).
  @Field(() => [ImportSampleRowType]) sampleRows: ImportSampleRowType[];
  @Field(() => [SuggestedColumnMappingType]) suggestedMapping: SuggestedColumnMappingType[];
  @Field(() => Int) totalRows: number;
}

@ObjectType('ImportRowError')
export class ImportRowErrorType {
  @Field(() => Int) rowNumber: number;
  @Field(() => [String]) errors: string[];
}

@ObjectType('ImportPatientPreview')
export class ImportPatientPreviewType {
  @Field(() => Int) rowNumber: number;
  @Field() first_name: string;
  @Field() last_name: string;
  @Field() email: string;
  @Field() phone: string;
  @Field({ nullable: true }) date_of_birth?: string;
}

@ObjectType('ImportDryRunResult')
export class ImportDryRunResultType {
  @Field(() => Int) totalRows: number;
  @Field(() => Int) validRows: number;
  @Field(() => Int) errorRows: number;
  // Capped -- see imports.service.ts's own comment.
  @Field(() => [ImportRowErrorType]) rowErrors: ImportRowErrorType[];
  @Field(() => [ImportPatientPreviewType]) sampleValidRows: ImportPatientPreviewType[];
}

@ObjectType('ImportCommitResult')
export class ImportCommitResultType {
  @Field(() => ID) importJobId: string;
  @Field(() => Int) totalRows: number;
  @Field(() => Int) importedRows: number;
  @Field(() => Int) errorRows: number;
  @Field(() => [ImportRowErrorType]) rowErrors: ImportRowErrorType[];
}
