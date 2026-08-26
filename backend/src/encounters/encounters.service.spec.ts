import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ020 P0. Encounters owns client_org_id directly (like Resources,
// REQ017) — org isolation is asserted against that column via
// assertSameOrg(); self-scoping additionally restricts a clinician/patient
// caller to their own encounter, mirroring appointments.service.ts.
describe('EncountersService', () => {
  let service: EncountersService;
  let prisma: any;
  let patientsService: { ownAndDependantPatientIds: jest.Mock };

  const clinicianA: JwtPayload = { sub: 'clin-a', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;
  const clinicianB: JwtPayload = { sub: 'clin-b', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-b' } as JwtPayload;
  const patientA: JwtPayload = { sub: 'pat-a', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-a', clinician_id: null } as JwtPayload;
  const patientOther: JwtPayload = { sub: 'pat-x', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-x', clinician_id: null } as JwtPayload;
  const managerA: JwtPayload = { sub: 'mgr-a', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const managerB: JwtPayload = { sub: 'mgr-b', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;
  const selfRegisteredPatient: JwtPayload = { sub: 'u-none', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const encounterOpen = {
    id: 'enc-1', client_org_id: 'org-a', appointment_id: 'appt-1', patient_id: 'pat-a', clinician_id: 'clin-a',
    status: 'in_progress', locked: false, signed_at: null, signed_by_id: null,
    created_at: new Date('2026-08-24T09:00:00Z'), updated_at: new Date('2026-08-24T09:00:00Z'),
  };
  const encounterSigned = { ...encounterOpen, id: 'enc-2', locked: true, status: 'signed' };

  beforeEach(async () => {
    prisma = {
      encounters: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      encounterNotes: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), upsert: jest.fn() },
      encounterAddenda: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      diagnoses: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      attachments: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      encounterTemplates: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
      appointments: { findUnique: jest.fn(), findFirst: jest.fn() },
      // REQ127: create() drives orderInvestigation(); findMany() already
      // backed patientTimeline()/withRelations().
      testResults: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
      patients: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-a', first_name: 'Anita', last_name: 'Sharma' }) },
      userProfiles: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null) },
      messageThreads: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PatientsService,
          // Mirrors the real ownAndDependantPatientIds()'s own behaviour for
          // a patient with no configured dependants -- existing tests below
          // (written before dependant self-scoping existed here) keep
          // working unchanged.
          useValue: (patientsService = {
            ownAndDependantPatientIds: jest.fn().mockImplementation(async (user: JwtPayload) => [user.patient_id ?? '__no_patient_link__']),
          }),
        },
      ],
    }).compile();
    service = module.get(EncountersService);
  });

  describe('encounter — tenant isolation and self-scoping', () => {
    it('rejects a cross-org encounter with NotFoundException', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(service.encounter('enc-1', managerB)).rejects.toThrow(NotFoundException);
    });

    it('rejects a clinician reading another clinician\'s encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(service.encounter('enc-1', clinicianB)).rejects.toThrow(NotFoundException);
    });

    it('rejects a patient reading another patient\'s encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(service.encounter('enc-1', patientOther)).rejects.toThrow(NotFoundException);
    });

    it('rejects an org-less non-operator outright (F-01 sentinel, never falls through)', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(service.encounter('enc-1', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
    });

    it('returns the encounter with its relations for the treating clinician', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      const result = await service.encounter('enc-1', clinicianA);
      expect(result.id).toBe('enc-1');
      expect(result.notes).toEqual([]);
    });

    it('returns the encounter for the owning patient', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      const result = await service.encounter('enc-1', patientA);
      expect(result.id).toBe('enc-1');
    });

    it('returns the encounter for a same-org manager (front-desk access)', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      const result = await service.encounter('enc-1', managerA);
      expect(result.id).toBe('enc-1');
    });
  });

  describe('getOrCreateEncounter — idempotent entry point', () => {
    const appointment = { id: 'appt-1', is_deleted: false, patient_id: 'pat-a', clinician_id: 'clin-a', clinic: { id: 'clinic-a', client_org_id: 'org-a' } };

    it('rejects a cross-org appointment', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      await expect(service.getOrCreateEncounter('appt-1', managerB)).rejects.toThrow(NotFoundException);
      expect(prisma.encounters.create).not.toHaveBeenCalled();
    });

    it('rejects a clinician who is not this appointment\'s clinician', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      await expect(service.getOrCreateEncounter('appt-1', clinicianB)).rejects.toThrow(ForbiddenException);
      expect(prisma.encounters.create).not.toHaveBeenCalled();
    });

    it('returns the existing encounter without creating a second one', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      const result = await service.getOrCreateEncounter('appt-1', clinicianA);
      expect(result.id).toBe('enc-1');
      expect(prisma.encounters.create).not.toHaveBeenCalled();
    });

    it('creates a new encounter stamping client_org_id from the appointment\'s clinic', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.encounters.findUnique.mockResolvedValue(null);
      prisma.encounters.create.mockResolvedValue(encounterOpen);
      await service.getOrCreateEncounter('appt-1', clinicianA);
      expect(prisma.encounters.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ client_org_id: 'org-a', appointment_id: 'appt-1', patient_id: 'pat-a', clinician_id: 'clin-a' }),
        }),
      );
    });

    // Found live (React 18 StrictMode's double-effect invocation raced two
    // real calls, but a genuine double-click/two-tabs reaches the same
    // path): find-then-create is not atomic, so the loser's unique-
    // constraint violation on appointment_id must resolve to the winner's
    // row, not a raw 500.
    it('resolves a concurrent-create race (P2002 on appointment_id) to the winning row instead of throwing', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.encounters.findUnique
        .mockResolvedValueOnce(null) // initial "does it exist" check: not yet
        .mockResolvedValueOnce(encounterOpen); // post-P2002 re-fetch: the winner's row
      prisma.encounters.create.mockRejectedValue({ code: 'P2002' });
      const result = await service.getOrCreateEncounter('appt-1', clinicianA);
      expect(result.id).toBe('enc-1');
    });

    it('re-throws a create failure that is not a unique-constraint race', async () => {
      prisma.appointments.findUnique.mockResolvedValue(appointment);
      prisma.encounters.findUnique.mockResolvedValueOnce(null);
      prisma.encounters.create.mockRejectedValue(new Error('connection reset'));
      await expect(service.getOrCreateEncounter('appt-1', clinicianA)).rejects.toThrow('connection reset');
    });
  });

  describe('saveEncounterNote — lock state machine', () => {
    it('rejects saving a note on a locked encounter (app-level fast path)', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterSigned);
      await expect(
        service.saveEncounterNote({ encounter_id: 'enc-2', section: 'complaints', content: 'x' } as any, clinicianA),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.encounterNotes.upsert).not.toHaveBeenCalled();
    });

    it('upserts and increments version on an open encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.encounterNotes.findUnique.mockResolvedValue({ version: 2 });
      prisma.encounterNotes.upsert.mockResolvedValue({ id: 'note-1', section: 'complaints', content: 'fever', version: 3 });
      await service.saveEncounterNote({ encounter_id: 'enc-1', section: 'complaints', content: 'fever' } as any, clinicianA);
      expect(prisma.encounterNotes.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { content: 'fever', version: 3 } }),
      );
    });
  });

  describe('signEncounter — one-way sign-off', () => {
    it('rejects signing an already-signed encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterSigned);
      await expect(service.signEncounter('enc-2', clinicianA)).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-clinician (e.g. front-desk staff) signing', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(service.signEncounter('enc-1', managerA)).rejects.toThrow(ForbiddenException);
      expect(prisma.encounters.update).not.toHaveBeenCalled();
    });

    it('locks the encounter and stamps signed_by/signed_at for the treating clinician', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.encounters.update.mockResolvedValue({ ...encounterOpen, locked: true, status: 'signed', signed_by_id: 'clin-a' });
      await service.signEncounter('enc-1', clinicianA);
      expect(prisma.encounters.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'enc-1' },
          data: expect.objectContaining({ locked: true, status: 'signed', signed_by_id: 'clin-a' }),
        }),
      );
    });
  });

  describe('addAddendum — allowed regardless of lock state', () => {
    it('allows an addendum on a signed (locked) encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterSigned);
      prisma.encounterAddenda.create.mockResolvedValue({ id: 'add-1', author_id: 'clin-a', content: 'correction', reason: null, created_at: new Date() });
      const result = await service.addAddendum({ encounter_id: 'enc-2', content: 'correction' } as any, clinicianA);
      expect(result.id).toBe('add-1');
      expect(prisma.encounterAddenda.create).toHaveBeenCalled();
    });

    it('still rejects a cross-org addendum attempt', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterSigned);
      await expect(
        service.addAddendum({ encounter_id: 'enc-2', content: 'x' } as any, managerB),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDiagnosis — also rejected once locked', () => {
    it('rejects creating a diagnosis on a locked encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterSigned);
      await expect(
        service.createDiagnosis({ encounter_id: 'enc-2', text: 'Hypertension' } as any, clinicianA),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a diagnosis on an open encounter, defaulting type to diagnosis', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.diagnoses.create.mockResolvedValue({ id: 'dx-1' });
      await service.createDiagnosis({ encounter_id: 'enc-1', text: 'Hypertension' } as any, clinicianA);
      expect(prisma.diagnoses.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'diagnosis', status: 'active' }) }),
      );
    });
  });

  // REQ127 (FR-EMR-08)
  describe('orderInvestigation', () => {
    it('rejects ordering on a locked encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterSigned);
      await expect(
        service.orderInvestigation({ encounter_id: 'enc-2', test_name: 'CBC', test_type: 'blood' } as any, clinicianA),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.testResults.create).not.toHaveBeenCalled();
    });

    it('creates a pending TestResults row linked to the encounter, defaulting urgency to routine', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.testResults.create.mockResolvedValue({
        id: 'tr-1', encounter_id: 'enc-1', test_name: 'CBC', test_type: 'blood', urgency: 'routine', status: 'pending', date_ordered: new Date('2026-08-26T00:00:00Z'),
      });
      const result = await service.orderInvestigation({ encounter_id: 'enc-1', test_name: 'CBC', test_type: 'blood' } as any, clinicianA);
      expect(prisma.testResults.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          encounter_id: 'enc-1', patient_id: 'pat-a', test_name: 'CBC', test_type: 'blood',
          urgency: 'routine', status: 'pending', ordered_by_user_id: 'clin-a',
        }),
      }));
      expect(result).toEqual(expect.objectContaining({ id: 'tr-1', urgency: 'routine', status: 'pending' }));
    });

    it('honours an explicit urgency', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.testResults.create.mockResolvedValue({ id: 'tr-1', encounter_id: 'enc-1', urgency: 'stat', status: 'pending', date_ordered: new Date() });
      await service.orderInvestigation({ encounter_id: 'enc-1', test_name: 'CBC', test_type: 'blood', urgency: 'stat' } as any, clinicianA);
      expect(prisma.testResults.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ urgency: 'stat' }) }));
    });

    it('appears in withRelations()\'s investigation_orders once ordered', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.testResults.findMany.mockResolvedValue([
        { id: 'tr-1', encounter_id: 'enc-1', test_name: 'CBC', test_type: 'blood', urgency: 'routine', status: 'pending', date_ordered: new Date('2026-08-26T00:00:00Z') },
      ]);
      const result = await service.encounter('enc-1', clinicianA);
      expect(result.investigation_orders).toEqual([expect.objectContaining({ id: 'tr-1', test_name: 'CBC', status: 'pending' })]);
    });
  });

  describe('patientAllergyBanner — cross-encounter query, gated by patient access', () => {
    it('rejects a different patient reading someone else\'s allergy banner', async () => {
      await expect(service.patientAllergyBanner('pat-a', patientOther)).rejects.toThrow(NotFoundException);
    });

    it('rejects a clinician who never treated this patient', async () => {
      prisma.appointments.findFirst.mockResolvedValue(null);
      await expect(service.patientAllergyBanner('pat-a', clinicianB)).rejects.toThrow(NotFoundException);
    });

    it('returns active allergy-type diagnoses across all encounters for the patient\'s own request', async () => {
      prisma.diagnoses.findMany.mockResolvedValue([{ id: 'dx-1', type: 'allergy', text: 'Penicillin' }]);
      const result = await service.patientAllergyBanner('pat-a', patientA);
      expect(result).toHaveLength(1);
      expect(prisma.diagnoses.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ type: 'allergy', status: 'active' }) }),
      );
    });
  });

  describe('applyTemplate — one action fills every section', () => {
    it('rejects applying a template to a locked encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValueOnce(encounterSigned);
      await expect(
        service.applyTemplate({ encounter_id: 'enc-2', template_id: 'tpl-1' } as any, clinicianA),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown template', async () => {
      prisma.encounters.findUnique.mockResolvedValueOnce(encounterOpen);
      prisma.encounterTemplates.findUnique.mockResolvedValue(null);
      await expect(
        service.applyTemplate({ encounter_id: 'enc-1', template_id: 'missing' } as any, clinicianA),
      ).rejects.toThrow(NotFoundException);
    });

    it('upserts every section from sections_json in one transaction', async () => {
      prisma.encounters.findUnique.mockResolvedValueOnce(encounterOpen).mockResolvedValueOnce(encounterOpen);
      prisma.encounterTemplates.findUnique.mockResolvedValue({
        id: 'tpl-1', sections_json: { complaints: 'Cough, cold', advice: 'Rest and fluids' },
      });
      await service.applyTemplate({ encounter_id: 'enc-1', template_id: 'tpl-1' } as any, clinicianA);
      expect(prisma.encounterNotes.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('createEncounterTemplate — org write-path', () => {
    it('rejects an org-less non-operator (orgIdForWrite fails closed)', async () => {
      await expect(
        service.createEncounterTemplate({ name: 'SOAP default', sections_json: '{}' } as any, selfRegisteredPatient),
      ).rejects.toThrow();
      expect(prisma.encounterTemplates.create).not.toHaveBeenCalled();
    });

    it('rejects invalid JSON in sections_json', async () => {
      await expect(
        service.createEncounterTemplate({ name: 'Bad', sections_json: 'not-json' } as any, clinicianA),
      ).rejects.toThrow(BadRequestException);
    });

    it('stamps client_org_id from the caller and clinician_id null for an org-shared template', async () => {
      prisma.encounterTemplates.create.mockResolvedValue({ id: 'tpl-1', sections_json: { complaints: 'x' } });
      await service.createEncounterTemplate(
        { name: 'Flu visit', sections_json: '{"complaints":"x"}', org_shared: true } as any,
        clinicianA,
      );
      expect(prisma.encounterTemplates.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', clinician_id: null }) }),
      );
    });

    it('stamps the caller\'s own clinician_id for a personal favourite', async () => {
      prisma.encounterTemplates.create.mockResolvedValue({ id: 'tpl-2', sections_json: { complaints: 'x' } });
      await service.createEncounterTemplate({ name: 'My template', sections_json: '{"complaints":"x"}' } as any, clinicianA);
      expect(prisma.encounterTemplates.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinician_id: 'clin-a' }) }),
      );
    });
  });

  describe('patientTimeline — aggregation shape, gated by patient access', () => {
    it('rejects access for a patient reading someone else\'s timeline', async () => {
      await expect(service.patientTimeline('pat-a', patientOther)).rejects.toThrow(NotFoundException);
    });

    it('returns a chronologically-sorted, typed array merging all four sources', async () => {
      prisma.encounters.findMany.mockResolvedValue([
        { id: 'enc-1', status: 'signed', created_at: new Date('2026-08-20'), notes: [{ section: 'complaints', content: 'fever' }] },
      ]);
      prisma.diagnoses.findMany.mockResolvedValue([
        { id: 'dx-1', type: 'diagnosis', text: 'Flu', icd10_code: null, created_at: new Date('2026-08-21') },
      ]);
      prisma.attachments.findMany.mockResolvedValue([
        { id: 'att-1', original_filename: 'scan.pdf', mime_type: 'application/pdf', created_at: new Date('2026-08-19'), encounter_id: 'enc-1' },
      ]);
      prisma.testResults.findMany.mockResolvedValue([
        { id: 'tr-1', test_name: 'CBC', status: 'completed', date_ordered: new Date('2026-08-22') },
      ]);
      const result = await service.patientTimeline('pat-a', patientA);
      expect(result).toHaveLength(4);
      expect(result.map((e: any) => e.type)).toEqual(['test_result', 'diagnosis', 'encounter', 'attachment']);
    });

    // REQ065 (REQ018 US-BOOK-02 residue) — found and fixed while building
    // REQ024's own US-MSG-05.
    it('allows a patient to read a dependant\'s timeline', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-a', 'dep-1']);
      await expect(service.patientTimeline('dep-1', patientA)).resolves.toBeDefined();
    });

    it('still rejects a timeline for neither the caller nor their dependant', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-a', 'dep-1']);
      await expect(service.patientTimeline('pat-x', patientA)).rejects.toThrow(NotFoundException);
    });

    // REQ024 (US-MSG-05).
    it('includes a patient_clinic message thread the patient\'s own login participates in', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue({ id: 'user-a' });
      prisma.messageThreads.findMany.mockResolvedValue([
        { id: 'thread-1', last_message: 'How are the test results?', last_activity: new Date('2026-08-23') },
      ]);
      const result = await service.patientTimeline('pat-a', patientA);
      const threadEvent: any = result.find((e: any) => e.type === 'message_thread');
      expect(threadEvent).toBeDefined();
      expect(threadEvent!.summary).toBe('How are the test results?');
      expect(prisma.messageThreads.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ thread_type: 'patient_clinic', participants: { some: { user_id: 'user-a' } } }) }),
      );
    });

    it('does not query message threads for a patient with no real login account', async () => {
      prisma.userProfiles.findFirst.mockResolvedValue(null);
      await service.patientTimeline('pat-a', patientA);
      expect(prisma.messageThreads.findMany).not.toHaveBeenCalled();
    });
  });
});
