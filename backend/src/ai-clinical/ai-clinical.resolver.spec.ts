import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AiClinicalResolver } from './ai-clinical.resolver';
import { REQUIRES_FEATURE_KEY, EntitlementGuard } from '../entitlements/entitlement.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

// P1-11 — mirrors PharmacyResolver's own entitlement-gating test pattern
// exactly (the metadata/guard wiring is asserted directly, not RolesGuard's
// or EntitlementGuard's own internal logic, which each have their own
// dedicated specs).
describe('AiClinicalResolver — role and entitlement gating', () => {
  const reflector = new Reflector();

  it('startTranscriptionSession carries @RequiresFeature(\'ai_scribe\')', () => {
    const key = reflector.get(REQUIRES_FEATURE_KEY, AiClinicalResolver.prototype.startTranscriptionSession);
    expect(key).toBe('ai_scribe');
  });

  it('startTranscriptionSession has EntitlementGuard attached via @UseGuards', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AiClinicalResolver.prototype.startTranscriptionSession) ?? [];
    expect(guards).toContain(EntitlementGuard);
  });

  it('no other handler carries @RequiresFeature — the gate sits only at the session-start entry point, deliberately not re-checked downstream', () => {
    const otherHandlers = [
      AiClinicalResolver.prototype.submitTranscription,
      AiClinicalResolver.prototype.structureTranscriptSession,
      AiClinicalResolver.prototype.aiExtractedPrescriptionDraft,
      AiClinicalResolver.prototype.preConsultSummary,
      AiClinicalResolver.prototype.myAiProviderConfig,
    ];
    otherHandlers.forEach((handler) => {
      expect(reflector.get(REQUIRES_FEATURE_KEY, handler)).toBeUndefined();
    });
  });

  it('clinical mutations/queries are gated to clinician/manager/admin/super_admin, never patient', () => {
    const clinicalHandlers = [
      AiClinicalResolver.prototype.startTranscriptionSession,
      AiClinicalResolver.prototype.submitTranscription,
      AiClinicalResolver.prototype.structureTranscriptSession,
      AiClinicalResolver.prototype.aiExtractedPrescriptionDraft,
      AiClinicalResolver.prototype.preConsultSummary,
    ];
    clinicalHandlers.forEach((handler) => {
      const roles = reflector.get(ROLES_KEY, handler);
      expect(roles).toContain('clinician');
      expect(roles).not.toContain('patient');
    });
  });

  it('provider config is admin/manager only — org-level configuration, not something a clinician sets', () => {
    const roles = reflector.get(ROLES_KEY, AiClinicalResolver.prototype.updateMyAiProviderConfig);
    expect(roles).toEqual(['manager', 'admin', 'super_admin']);
  });

  it('the provider catalog query carries no role restriction (a public-shape listing, no credentials attached)', () => {
    expect(reflector.get(ROLES_KEY, AiClinicalResolver.prototype.aiTranscriptionProviders)).toBeUndefined();
  });
});
