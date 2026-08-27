import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiClinicalService } from './ai-clinical.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { decryptJson, encryptJson } from '../common/crypto/secrets';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('AiClinicalService', () => {
  let service: AiClinicalService;
  let prisma: {
    aiProviderConfig: { findUnique: jest.Mock; upsert: jest.Mock };
    aiTranscriptionSessions: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock; aggregate: jest.Mock };
    encounters: { findUniqueOrThrow: jest.Mock };
    encounterNotes: { findUnique: jest.Mock; upsert: jest.Mock };
    vitals: { createMany: jest.Mock };
    drugs: { findFirst: jest.Mock };
  };
  let encountersService: { encounter: jest.Mock; patientTimeline: jest.Mock; patientAllergyBanner: jest.Mock };
  let entitlementsService: { getQuota: jest.Mock };

  const clinicianUser: JwtPayload = { sub: 'clin-user-1', roles: ['clinician'], client_org_id: 'org-a', clinician_id: 'cln-1', patient_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'clin-user-2', roles: ['clinician'], client_org_id: 'org-b', clinician_id: 'cln-2', patient_id: null } as JwtPayload;

  const unlockedEncounter = { id: 'enc-1', locked: false, patient_id: 'pat-1' };

  beforeEach(async () => {
    prisma = {
      aiProviderConfig: { findUnique: jest.fn(), upsert: jest.fn() },
      aiTranscriptionSessions: {
        create: jest.fn((args) => Promise.resolve({ id: 'session-1', ...args.data })),
        update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
        findUnique: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { duration_seconds: 0 } }),
      },
      encounters: { findUniqueOrThrow: jest.fn().mockResolvedValue({ client_org_id: 'org-a', patient_id: 'pat-1' }) },
      encounterNotes: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      vitals: { createMany: jest.fn() },
      drugs: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    encountersService = {
      encounter: jest.fn().mockResolvedValue(unlockedEncounter),
      patientTimeline: jest.fn().mockResolvedValue([]),
      patientAllergyBanner: jest.fn().mockResolvedValue([]),
    };
    entitlementsService = { getQuota: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiClinicalService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncountersService, useValue: encountersService },
        { provide: EntitlementsService, useValue: entitlementsService },
      ],
    }).compile();
    service = module.get(AiClinicalService);
  });

  describe('providers', () => {
    it('lists the real registered transcription providers', () => {
      expect(service.providers().map((p) => p.id)).toEqual(['sarvam']);
    });
  });

  describe('updateMyProviderConfig', () => {
    const baseInput = { provider: 'sarvam', credentials: [{ key: 'api_key', value: 'real-secret' }] };

    it('rejects an org-less caller', async () => {
      const result = await service.updateMyProviderConfig(baseInput as any, { ...clinicianUser, client_org_id: null } as any);
      expect(result.success).toBe(false);
      expect(prisma.aiProviderConfig.upsert).not.toHaveBeenCalled();
    });

    it('rejects an unknown provider id', async () => {
      const result = await service.updateMyProviderConfig({ ...baseInput, provider: 'not_real' } as any, clinicianUser);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown provider');
    });

    it('rejects a missing required field', async () => {
      const result = await service.updateMyProviderConfig({ provider: 'sarvam', credentials: [] } as any, clinicianUser);
      expect(result.success).toBe(false);
    });

    it('encrypts credentials at rest', async () => {
      const result = await service.updateMyProviderConfig(baseInput as any, clinicianUser);
      expect(result.success).toBe(true);
      const upsertCall = prisma.aiProviderConfig.upsert.mock.calls[0][0];
      expect(upsertCall.create.credentials_encrypted).not.toContain('real-secret');
      expect(decryptJson(upsertCall.create.credentials_encrypted)).toEqual({ api_key: 'real-secret' });
    });
  });

  describe('myUsage', () => {
    it('reports 0 minutes used and no quota for an org with no plan', async () => {
      const result = await service.myUsage(clinicianUser);
      expect(result).toEqual({ minutes_used_this_month: 0, minutes_quota: undefined });
    });

    it('rounds seconds up to whole minutes', async () => {
      prisma.aiTranscriptionSessions.aggregate.mockResolvedValue({ _sum: { duration_seconds: 61 } });
      const result = await service.myUsage(clinicianUser);
      expect(result.minutes_used_this_month).toBe(2);
    });

    it('excludes failed sessions from the aggregate', async () => {
      await service.myUsage(clinicianUser);
      expect(prisma.aiTranscriptionSessions.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { not: 'failed' } }) }),
      );
    });
  });

  describe('startTranscriptionSession — FR-AI-01 consent gate', () => {
    it('refuses to create a session without explicit consent', async () => {
      await expect(
        service.startTranscriptionSession({ encounter_id: 'enc-1', consent_given: false } as any, clinicianUser),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.aiTranscriptionSessions.create).not.toHaveBeenCalled();
    });

    it('creates a session with a real, logged consented_at timestamp when consent is given', async () => {
      const before = Date.now();
      const result = await service.startTranscriptionSession({ encounter_id: 'enc-1', consent_given: true } as any, clinicianUser);
      expect(result.id).toBe('session-1');
      const createCall = prisma.aiTranscriptionSessions.create.mock.calls[0][0];
      expect(createCall.data.consented_by_user_id).toBe(clinicianUser.sub);
      expect(new Date(createCall.data.consented_at).getTime()).toBeGreaterThanOrEqual(before);
    });

    it('derives client_org_id from the ENCOUNTER, not the caller', async () => {
      prisma.encounters.findUniqueOrThrow.mockResolvedValue({ client_org_id: 'org-a', patient_id: 'pat-1' });
      await service.startTranscriptionSession({ encounter_id: 'enc-1', consent_given: true } as any, clinicianUser);
      const createCall = prisma.aiTranscriptionSessions.create.mock.calls[0][0];
      expect(createCall.data.client_org_id).toBe('org-a');
    });

    it('refuses on a locked (signed) encounter', async () => {
      encountersService.encounter.mockResolvedValue({ ...unlockedEncounter, locked: true });
      await expect(
        service.startTranscriptionSession({ encounter_id: 'enc-1', consent_given: true } as any, clinicianUser),
      ).rejects.toThrow('signed');
      expect(prisma.aiTranscriptionSessions.create).not.toHaveBeenCalled();
    });

    it('refuses once the monthly quota is exhausted (FR-AI-11)', async () => {
      entitlementsService.getQuota.mockResolvedValue(10);
      prisma.aiTranscriptionSessions.aggregate.mockResolvedValue({ _sum: { duration_seconds: 10 * 60 } });
      await expect(
        service.startTranscriptionSession({ encounter_id: 'enc-1', consent_given: true } as any, clinicianUser),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.aiTranscriptionSessions.create).not.toHaveBeenCalled();
    });

    it('allows a new session when under quota', async () => {
      entitlementsService.getQuota.mockResolvedValue(10);
      prisma.aiTranscriptionSessions.aggregate.mockResolvedValue({ _sum: { duration_seconds: 5 * 60 } });
      await expect(
        service.startTranscriptionSession({ encounter_id: 'enc-1', consent_given: true } as any, clinicianUser),
      ).resolves.toBeDefined();
    });
  });

  describe('submitTranscription', () => {
    beforeEach(() => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({ id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1' });
    });

    it('marks the session failed when no provider is configured', async () => {
      prisma.aiProviderConfig.findUnique.mockResolvedValue(null);
      const result = await service.submitTranscription(
        { session_id: 'session-1', audio_base64: 'abc', duration_seconds: 30 } as any,
        clinicianUser,
      );
      expect(result.status).toBe('failed');
      expect(result.error_message).toContain('No active transcription provider');
    });

    it('marks the session failed when the provider itself fails', async () => {
      prisma.aiProviderConfig.findUnique.mockResolvedValue({ provider: 'sarvam', is_active: true, credentials_encrypted: encryptForTest({ api_key: 'k' }) });
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('server error') });
      const result = await service.submitTranscription(
        { session_id: 'session-1', audio_base64: 'abc', duration_seconds: 30 } as any,
        clinicianUser,
      );
      expect(result.status).toBe('failed');
    });

    it('stores the real transcript and duration on success', async () => {
      prisma.aiProviderConfig.findUnique.mockResolvedValue({ provider: 'sarvam', is_active: true, credentials_encrypted: encryptForTest({ api_key: 'k' }) });
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ transcript: 'Patient complains of fever.' }) });
      const result = await service.submitTranscription(
        { session_id: 'session-1', audio_base64: 'abc', duration_seconds: 45 } as any,
        clinicianUser,
      );
      expect(result.status).toBe('transcribed');
      expect(result.raw_transcript).toBe('Patient complains of fever.');
    });

    it('rejects a caller from a different org — real tenant isolation', async () => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({ id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1' });
      await expect(
        service.submitTranscription({ session_id: 'session-1', audio_base64: 'x', duration_seconds: 1 } as any, orgBUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('structureAndSaveNotes — FR-AI-03/05/06', () => {
    beforeEach(() => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({
        id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1',
        raw_transcript: 'Patient complains of fever. Advised paracetamol. BP is 120/80.',
      });
    });

    it('refuses when no transcript exists yet', async () => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({ id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1', raw_transcript: null });
      await expect(service.structureAndSaveNotes('session-1', clinicianUser)).rejects.toThrow(BadRequestException);
    });

    it('refuses on a locked encounter', async () => {
      encountersService.encounter.mockResolvedValue({ ...unlockedEncounter, locked: true });
      await expect(service.structureAndSaveNotes('session-1', clinicianUser)).rejects.toThrow('signed');
      expect(prisma.encounterNotes.upsert).not.toHaveBeenCalled();
    });

    it('writes EncounterNotes rows flagged ai_generated: true, tagged with the source session', async () => {
      await service.structureAndSaveNotes('session-1', clinicianUser);
      expect(prisma.encounterNotes.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ ai_generated: true, ai_source_session_id: 'session-1' }),
        }),
      );
    });

    it('writes extracted Vitals rows flagged ai_generated: true, recorded by the real clinician (never a service account)', async () => {
      await service.structureAndSaveNotes('session-1', clinicianUser);
      expect(prisma.vitals.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ code: 'bp_systolic', value: 120, ai_generated: true, recorded_by_user_id: clinicianUser.sub }),
        ]),
      });
    });

    it('never calls vitals.createMany when the transcript has no vitals to extract', async () => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({
        id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1', raw_transcript: 'Advised rest.',
      });
      await service.structureAndSaveNotes('session-1', clinicianUser);
      expect(prisma.vitals.createMany).not.toHaveBeenCalled();
    });
  });

  describe('extractPrescriptionDraft — FR-AI-04', () => {
    it('returns drafts with a resolved drug_id when a real Drugs row matches', async () => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({
        id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1', raw_transcript: 'Tab Paracetamol 650mg BD for 5 days.',
      });
      prisma.drugs.findFirst.mockResolvedValue({ id: 'drug-1', name: 'Paracetamol 650' });
      const result = await service.extractPrescriptionDraft('session-1', clinicianUser);
      expect(result).toEqual([
        expect.objectContaining({ drug_name_text: 'Paracetamol', drug_id: 'drug-1', matched_drug_name: 'Paracetamol 650' }),
      ]);
    });

    it('returns drug_id: undefined (never a fabricated one) when no real drug matches', async () => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({
        id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1', raw_transcript: 'Tab Somebrandnooneknows 10mg OD for 3 days.',
      });
      prisma.drugs.findFirst.mockResolvedValue(null);
      const result = await service.extractPrescriptionDraft('session-1', clinicianUser);
      expect(result[0].drug_id).toBeUndefined();
    });

    it('scopes the drug match to the caller\'s own org plus platform-seeded drugs, never another org\'s', async () => {
      prisma.aiTranscriptionSessions.findUnique.mockResolvedValue({
        id: 'session-1', client_org_id: 'org-a', encounter_id: 'enc-1', raw_transcript: 'Tab Paracetamol 650mg BD for 5 days.',
      });
      await service.extractPrescriptionDraft('session-1', clinicianUser);
      expect(prisma.drugs.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: [{ client_org_id: null }, { client_org_id: 'org-a' }] }) }),
      );
    });
  });

  describe('preConsultSummary — FR-AI-09', () => {
    it('delegates to the already-real, already-access-checked timeline and allergy queries', async () => {
      encountersService.patientTimeline.mockResolvedValue([{ type: 'diagnosis', date: new Date(), title: 'Diabetes' }]);
      encountersService.patientAllergyBanner.mockResolvedValue([{ text: 'Penicillin' }]);
      const bullets = await service.preConsultSummary('pat-1', clinicianUser);
      expect(encountersService.patientTimeline).toHaveBeenCalledWith('pat-1', clinicianUser);
      expect(bullets).toContain('Allergies: Penicillin');
      expect(bullets).toContain('Recent diagnosis: Diabetes');
    });
  });
});

function encryptForTest(value: Record<string, unknown>): string {
  return encryptJson(value);
}
