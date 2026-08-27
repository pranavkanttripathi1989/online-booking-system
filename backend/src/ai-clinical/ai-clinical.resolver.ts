import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AiClinicalService, AI_SCRIBE_FEATURE_KEY } from './ai-clinical.service';
import {
  AiProviderOptionType,
  AiProviderConfigType,
  AiProviderConfigResultType,
  AiUsageSummaryType,
  AiTranscriptionSessionType,
  StructureTranscriptResultType,
  AiExtractedPrescriptionItemType,
  EncounterCodeSuggestionsType,
} from './entities/ai-clinical.entity';
import { StartTranscriptionSessionInput, SubmitTranscriptionInput, UpdateAiProviderConfigInput } from './dto/ai-clinical.input';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { EntitlementGuard, RequiresFeature } from '../entitlements/entitlement.guard';

const CLINICAL_ROLES = ['clinician', 'manager', 'admin', 'super_admin'] as const;

@Resolver()
export class AiClinicalResolver {
  constructor(private readonly service: AiClinicalService) {}

  @Query(() => [AiProviderOptionType])
  aiTranscriptionProviders() {
    return this.service.providers();
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => AiProviderConfigType)
  myAiProviderConfig(@CurrentUser() user: JwtPayload) {
    return this.service.myProviderConfig(user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Mutation(() => AiProviderConfigResultType)
  updateMyAiProviderConfig(@Args('input') input: UpdateAiProviderConfigInput, @CurrentUser() user: JwtPayload) {
    return this.service.updateMyProviderConfig(input, user);
  }

  @Auth('manager', 'admin', 'super_admin')
  @Query(() => AiUsageSummaryType)
  myAiUsage(@CurrentUser() user: JwtPayload) {
    return this.service.myUsage(user);
  }

  // FR-AI-01 — the feature flag gate sits at this entry point: nothing
  // downstream (submit/structure/extract) is reachable without a session
  // this call created, and this is the one place consent is captured.
  @Auth(...CLINICAL_ROLES)
  @UseGuards(EntitlementGuard)
  @RequiresFeature(AI_SCRIBE_FEATURE_KEY)
  @Mutation(() => AiTranscriptionSessionType)
  startTranscriptionSession(@Args('input') input: StartTranscriptionSessionInput, @CurrentUser() user: JwtPayload) {
    return this.service.startTranscriptionSession(input, user);
  }

  @Auth(...CLINICAL_ROLES)
  @Mutation(() => AiTranscriptionSessionType)
  submitTranscription(@Args('input') input: SubmitTranscriptionInput, @CurrentUser() user: JwtPayload) {
    return this.service.submitTranscription(input, user);
  }

  @Auth(...CLINICAL_ROLES)
  @Mutation(() => StructureTranscriptResultType)
  structureTranscriptSession(@Args('session_id', { type: () => ID }) sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.structureAndSaveNotes(sessionId, user);
  }

  @Auth(...CLINICAL_ROLES)
  @Query(() => [AiExtractedPrescriptionItemType])
  aiExtractedPrescriptionDraft(@Args('session_id', { type: () => ID }) sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.extractPrescriptionDraft(sessionId, user);
  }

  // FR-AI-09 — deliberately excludes 'patient' (and 'staff'): this is
  // clinical consultation prep, not a patient-facing summary.
  @Auth('clinician', 'manager', 'admin', 'super_admin')
  @Query(() => [String])
  preConsultSummary(@Args('patient_id', { type: () => ID }) patientId: string, @CurrentUser() user: JwtPayload) {
    return this.service.preConsultSummary(patientId, user);
  }

  // P2-02 — same role gate as the other clinical AI queries above. No
  // EntitlementGuard: unlike transcription, this has no external vendor
  // cost to meter.
  @Auth(...CLINICAL_ROLES)
  @Query(() => EncounterCodeSuggestionsType)
  suggestEncounterCodes(@Args('encounter_id', { type: () => ID }) encounterId: string, @CurrentUser() user: JwtPayload) {
    return this.service.suggestEncounterCodes(encounterId, user);
  }
}
