import { ObjectType, Field, ID, Int, Float } from '@nestjs/graphql';

@ObjectType('AiTranscriptionSession')
export class AiTranscriptionSessionType {
  @Field(() => ID) id: string;
  @Field(() => ID) encounter_id: string;
  @Field() status: string;
  @Field({ nullable: true }) provider?: string;
  @Field({ nullable: true }) raw_transcript?: string;
  @Field({ nullable: true }) error_message?: string;
  @Field() consented_at: Date;
  @Field() created_at: Date;
}

@ObjectType('AiStructuredSection')
export class AiStructuredSectionType {
  @Field() section: string;
  @Field() content: string;
}

@ObjectType('AiExtractedVital')
export class AiExtractedVitalType {
  @Field() code: string;
  @Field(() => Float) value: number;
}

@ObjectType('StructureTranscriptResult')
export class StructureTranscriptResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
  @Field(() => [AiStructuredSectionType]) sections: AiStructuredSectionType[];
  @Field(() => [AiExtractedVitalType]) vitals: AiExtractedVitalType[];
}

// P1-12 (FR-AI-04) — a DRAFT row only; drug_id is populated when the free-
// text extraction confidently matched a real Drugs row, left null
// otherwise (the frontend still shows drug_name_text either way, letting
// the clinician pick the real drug from the existing search — nothing
// here is ever auto-committed to a real PrescriptionItems row).
@ObjectType('AiExtractedPrescriptionItem')
export class AiExtractedPrescriptionItemType {
  @Field() drug_name_text: string;
  @Field(() => ID, { nullable: true }) drug_id?: string;
  @Field({ nullable: true }) matched_drug_name?: string;
  @Field({ nullable: true }) dose?: string;
  @Field({ nullable: true }) frequency?: string;
  @Field(() => Int, { nullable: true }) duration_days?: number;
}

@ObjectType('AiProviderField')
export class AiProviderFieldType {
  @Field() key: string;
  @Field() label: string;
  @Field() type: string;
  @Field() required: boolean;
}

// P2-02 (FR-AI coding assist) — a DRAFT suggestion only, mirroring
// AiExtractedPrescriptionItemType's own "draft, never auto-committed"
// discipline: nothing here is ever saved as a Diagnoses row without a
// clinician reviewing and submitting it through the existing "Add
// Diagnosis" dialog. matched_terms surfaces exactly which words in the
// note triggered this suggestion, so it is reviewable, not a black box.
@ObjectType('CodeSuggestion')
export class CodeSuggestionType {
  @Field() code: string;
  @Field() description: string;
  @Field() category: string;
  @Field(() => [String]) matched_terms: string[];
  @Field(() => Float) score: number;
}

@ObjectType('EncounterCodeSuggestions')
export class EncounterCodeSuggestionsType {
  @Field(() => [CodeSuggestionType]) diagnosis_suggestions: CodeSuggestionType[];
  @Field(() => [CodeSuggestionType]) procedure_suggestions: CodeSuggestionType[];
}

@ObjectType('AiProviderOption')
export class AiProviderOptionType {
  @Field() id: string;
  @Field() label: string;
  @Field(() => [AiProviderFieldType]) fields: AiProviderFieldType[];
}

@ObjectType('AiProviderConfig')
export class AiProviderConfigType {
  @Field({ nullable: true }) provider?: string;
  @Field() has_credentials: boolean;
}

@ObjectType('AiProviderConfigResult')
export class AiProviderConfigResultType {
  @Field() success: boolean;
  @Field({ nullable: true }) message?: string;
}

// FR-AI-11 — "per-tenant AI usage metering exposed to the plan engine".
// minutes_used_this_month is the same aggregate startTranscriptionSession()
// checks against the quota before allowing a new session — exposed here
// so an org can see it BEFORE hitting the limit, not just be blocked by it.
@ObjectType('AiUsageSummary')
export class AiUsageSummaryType {
  @Field(() => Int) minutes_used_this_month: number;
  @Field(() => Int, { nullable: true }) minutes_quota?: number;
}
