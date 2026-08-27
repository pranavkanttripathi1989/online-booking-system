import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { NotificationProviderConfigService } from '../notifications/notification-provider-config.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ021 P0. Prescriptions has no client_org_id of its own — org isolation
// is asserted via encounter.client_org_id (isSameOrg), mirroring
// encounters.service.ts's own pattern. Self-scoping additionally restricts
// a clinician/patient caller to their own prescriptions.
describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let prisma: any;
  let patientsService: { ownAndDependantPatientIds: jest.Mock };
  let jwtService: { sign: jest.Mock; verifyAsync: jest.Mock };
  let providerConfigService: { getActiveConfigForOrg: jest.Mock };

  const clinicianA: JwtPayload = { sub: 'clin-a', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;
  const clinicianB: JwtPayload = { sub: 'clin-b', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-b' } as JwtPayload;
  const patientA: JwtPayload = { sub: 'pat-a', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-a', clinician_id: null } as JwtPayload;
  const patientOther: JwtPayload = { sub: 'pat-x', roles: ['patient'], client_org_id: 'org-a', patient_id: 'pat-x', clinician_id: null } as JwtPayload;
  const managerB: JwtPayload = { sub: 'mgr-b', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;
  const selfRegisteredPatient: JwtPayload = { sub: 'u-none', roles: ['patient'], client_org_id: null, patient_id: null, clinician_id: null } as JwtPayload;

  const encounterOpen = {
    id: 'enc-1',
    client_org_id: 'org-a',
    appointment_id: 'appt-1',
    patient_id: 'pat-a',
    clinician_id: 'clin-a',
    created_at: new Date('2026-08-24'),
    consultation_mode: 'in_person',
  };

  const rxItem = { id: 'item-1', drug_id: 'drug-1', dose: '500mg', frequency: 'BD', route: 'oral', duration_days: 5, qty: 10, instructions: null, substitutable: true };
  const prescriptionOpen = {
    id: 'rx-1', encounter_id: 'enc-1', patient_id: 'pat-a', clinician_id: 'clin-a',
    mode: 'in_person', issued_at: new Date('2026-08-24'), language: 'en',
    repeated_from_id: null, reprint_count: 0, encounter: encounterOpen, items: [rxItem],
  };

  beforeEach(async () => {
    prisma = {
      prescriptions: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
      encounters: { findUnique: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      diagnoses: { count: jest.fn().mockResolvedValue(1) },
      appointments: { findFirst: jest.fn() },
      drugs: { findMany: jest.fn().mockResolvedValue([{ id: 'drug-1', name: 'Amoxicillin', tpg_list: 'O' }]) },
      clinicians: { findUnique: jest.fn() },
      patients: { findUnique: jest.fn() },
      clientOrganizations: { findUnique: jest.fn() },
      prescriptionSets: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), findUnique: jest.fn() },
      prescriptionShareOtps: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PatientsService,
          // Mirrors the real ownAndDependantPatientIds()'s own behaviour for
          // a patient with no configured dependants -- existing tests below
          // (written before dependant self-scoping existed) keep working
          // unchanged; only the new dependant-specific cases override this.
          useValue: (patientsService = {
            ownAndDependantPatientIds: jest.fn().mockImplementation(async (user: JwtPayload) => [user.patient_id ?? '__no_patient_link__']),
          }),
        },
        { provide: JwtService, useValue: (jwtService = { sign: jest.fn().mockReturnValue('signed-token'), verifyAsync: jest.fn() }) },
        { provide: NotificationProviderConfigService, useValue: (providerConfigService = { getActiveConfigForOrg: jest.fn() }) },
      ],
    }).compile();
    service = module.get(PrescriptionsService);
  });

  describe('qty auto-calculation (US-RX-01)', () => {
    it.each([
      ['OD', 5, 5],
      ['BD', 5, 10],
      ['TDS', 5, 15],
      ['QID', 3, 12],
      ['HS', 7, 7],
    ])('frequency %s x %s days -> qty %s', async (frequency, duration, expectedQty) => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValue({ ...prescriptionOpen, items: [{ ...rxItem, frequency, duration_days: duration, qty: expectedQty }] });
      await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency, duration_days: duration } as any] } as any, clinicianA);
      expect(prisma.prescriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: { create: [expect.objectContaining({ qty: expectedQty })] },
          }),
        }),
      );
    });

    it('SOS (as-needed) never auto-calculates a qty, even with a duration given', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'SOS', duration_days: 5 } as any] } as any, clinicianA);
      expect(prisma.prescriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ items: { create: [expect.objectContaining({ qty: undefined })] } }),
        }),
      );
    });

    it('no duration given -> no qty, regardless of frequency', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'BD' } as any] } as any, clinicianA);
      expect(prisma.prescriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ items: { create: [expect.objectContaining({ qty: undefined })] } }),
        }),
      );
    });
  });

  describe('createPrescription — tenant isolation and role gating', () => {
    it('rejects a non-clinician (e.g. front-desk staff) issuing a prescription', async () => {
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'd', dose: '1', frequency: 'OD' } as any] } as any, managerB),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('rejects a cross-org encounter', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'd', dose: '1', frequency: 'OD' } as any] } as any, { ...clinicianA, client_org_id: 'org-b' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('rejects a clinician who is not this encounter\'s clinician', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'd', dose: '1', frequency: 'OD' } as any] } as any, clinicianB),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('rejects repeating a prescription that belongs to a different patient', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.findUnique.mockResolvedValue({ ...prescriptionOpen, patient_id: 'pat-x' });
      await expect(
        service.createPrescription(
          { encounter_id: 'enc-1', repeated_from_id: 'rx-1', items: [{ drug_id: 'd', dose: '1', frequency: 'OD' } as any] } as any,
          clinicianA,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('creates a prescription stamping patient_id/clinician_id from the encounter, not the input', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '500mg', frequency: 'BD', duration_days: 5 } as any] } as any, clinicianA);
      expect(prisma.prescriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patient_id: 'pat-a', clinician_id: 'clin-a' }) }),
      );
    });
  });

  // REQ026 (US-RX-06, FR-RX-10/11) — Telemedicine Practice Guidelines
  // enforcement. Only applies when consultation_mode !== 'in_person'.
  describe('createPrescription — TPG teleconsultation drug-list enforcement', () => {
    const teleEncounter = { ...encounterOpen, consultation_mode: 'video' };

    it('blocks a prohibited (NDPS/Schedule X) drug outright, with no override', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-x', name: 'Alprazolam', tpg_list: 'prohibited' }]);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-x', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).rejects.toThrow(/scheduled\/NDPS/i);
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('blocks an unclassified drug — fail closed, not safe by default', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-y', name: 'Mystery Drug', tpg_list: null }]);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-y', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).rejects.toThrow(/has not been classified/i);
    });

    it('blocks a List B (follow-up-only) drug on a first teleconsultation', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.encounters.count.mockResolvedValue(0); // no prior encounter -> first consultation
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-b', name: 'Isotretinoin', tpg_list: 'B' }]);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-b', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).rejects.toThrow(/follow-up-only/i);
    });

    it('allows a List B drug on a follow-up teleconsultation (a prior encounter exists)', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.encounters.count.mockResolvedValue(1); // a prior encounter exists -> follow-up
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-b', name: 'Isotretinoin', tpg_list: 'B' }]);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-b', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).resolves.toBeDefined();
    });

    it('allows List O/A drugs on a first teleconsultation', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.encounters.count.mockResolvedValue(0);
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-1', name: 'Paracetamol', tpg_list: 'O' }]);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).resolves.toBeDefined();
    });

    it('requires a diagnosis recorded before issuing in tele mode', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.diagnoses.count.mockResolvedValue(0);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).rejects.toThrow(/diagnosis/i);
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('never runs the TPG guard for an in-person encounter, even with no diagnosis recorded', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen); // consultation_mode: 'in_person'
      prisma.diagnoses.count.mockResolvedValue(0);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await expect(
        service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, clinicianA),
      ).resolves.toBeDefined();
      expect(prisma.diagnoses.count).not.toHaveBeenCalled();
    });

    it('stamps the real consultation_mode onto the created prescription, not a hardcoded value', async () => {
      prisma.encounters.findUnique.mockResolvedValue(teleEncounter);
      prisma.encounters.count.mockResolvedValue(1);
      prisma.drugs.findMany.mockResolvedValue([{ id: 'drug-1', name: 'Paracetamol', tpg_list: 'O' }]);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, clinicianA);
      expect(prisma.prescriptions.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ mode: 'video' }) }));
    });
  });

  // REQ129 (US-RX-08)
  describe('createPrescription — tamper-evident content hash', () => {
    it('stamps a pdf_hash onto the row right after creating it', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValue(prescriptionOpen);
      const result = await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '500mg', frequency: 'BD', duration_days: 5 } as any] } as any, clinicianA);
      expect(prisma.prescriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rx-1' }, data: { pdf_hash: expect.any(String) } }),
      );
      expect(result.pdf_hash).toEqual(expect.any(String));
      expect(result.pdf_hash).toHaveLength(64); // sha256 hex digest
    });

    it('produces the same hash for the same content and a different one for different content', async () => {
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValueOnce(prescriptionOpen);
      const first = await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '500mg', frequency: 'BD', duration_days: 5 } as any] } as any, clinicianA);

      prisma.prescriptions.create.mockResolvedValueOnce({ ...prescriptionOpen, items: [{ ...rxItem, dose: '250mg' }] });
      const second = await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '250mg', frequency: 'BD', duration_days: 5 } as any] } as any, clinicianA);

      expect(first.pdf_hash).not.toEqual(second.pdf_hash);
    });
  });

  describe('verifyPrescriptionIntegrity', () => {
    it('is valid when the stored hash matches the current content', async () => {
      const hashedRow = { ...prescriptionOpen, pdf_hash: undefined };
      // Compute the real hash the same way the service would, via a real
      // create+update round trip, then verify against that same row.
      prisma.encounters.findUnique.mockResolvedValue(encounterOpen);
      prisma.prescriptions.create.mockResolvedValue(hashedRow);
      const created = await service.createPrescription({ encounter_id: 'enc-1', items: [{ drug_id: 'drug-1', dose: '500mg', frequency: 'BD', duration_days: 5 } as any] } as any, clinicianA);

      prisma.prescriptions.findUnique.mockResolvedValue({ ...hashedRow, pdf_hash: created.pdf_hash });
      const result = await service.verifyPrescriptionIntegrity('rx-1', clinicianA);
      expect(result.valid).toBe(true);
      expect(result.stored_hash).toBe(created.pdf_hash);
      expect(result.computed_hash).toBe(created.pdf_hash);
    });

    it('is invalid when the stored hash does not match the current content (tamper detected)', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue({ ...prescriptionOpen, pdf_hash: 'not-the-real-hash' });
      const result = await service.verifyPrescriptionIntegrity('rx-1', clinicianA);
      expect(result.valid).toBe(false);
      expect(result.stored_hash).toBe('not-the-real-hash');
    });

    it('is invalid (never crashes) when the row predates this column and has no stored hash', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue({ ...prescriptionOpen, pdf_hash: null });
      const result = await service.verifyPrescriptionIntegrity('rx-1', clinicianA);
      expect(result.valid).toBe(false);
      expect(result.stored_hash).toBeUndefined();
    });

    it('rejects a cross-org caller, same access control as prescription()', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.verifyPrescriptionIntegrity('rx-1', { ...clinicianA, client_org_id: 'org-b' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('prescription() / patientPrescriptions() — tenant isolation and self-scoping', () => {
    it('rejects a cross-org read', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.prescription('rx-1', managerB)).rejects.toThrow(NotFoundException);
    });

    it('rejects a patient reading another patient\'s prescription', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.prescription('rx-1', patientOther)).rejects.toThrow(NotFoundException);
    });

    it('rejects a clinician reading another clinician\'s prescription', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.prescription('rx-1', clinicianB)).rejects.toThrow(NotFoundException);
    });

    it('rejects an org-less non-operator outright (F-01 sentinel, never falls through)', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.prescription('rx-1', selfRegisteredPatient)).rejects.toThrow(NotFoundException);
    });

    it('returns the prescription with drug names resolved for the owning patient', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      const result = await service.prescription('rx-1', patientA);
      expect(result.items[0].drug_name).toBe('Amoxicillin');
    });

    it('rejects patientPrescriptions for a clinician who never treated this patient', async () => {
      prisma.appointments.findFirst.mockResolvedValue(null);
      await expect(service.patientPrescriptions('pat-a', clinicianB)).rejects.toThrow(NotFoundException);
    });

    it('returns patientPrescriptions for the owning patient', async () => {
      prisma.prescriptions.findMany.mockResolvedValue([prescriptionOpen]);
      const result = await service.patientPrescriptions('pat-a', patientA);
      expect(result).toHaveLength(1);
    });

    // REQ065 (REQ018 US-BOOK-02 residue) — a patient caller may read a
    // dependant's prescriptions too, not just their own.
    it('allows a patient to read a dependant\'s prescription via prescription()', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-a', 'dep-1']);
      prisma.prescriptions.findUnique.mockResolvedValue({ ...prescriptionOpen, patient_id: 'dep-1' });
      const result = await service.prescription('rx-1', patientA);
      expect(result.patient_id).toBe('dep-1');
    });

    it('still rejects a prescription belonging to neither the caller nor their dependants', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-a', 'dep-1']);
      prisma.prescriptions.findUnique.mockResolvedValue({ ...prescriptionOpen, patient_id: 'pat-x' });
      await expect(service.prescription('rx-1', patientA)).rejects.toThrow(NotFoundException);
    });

    it('allows a patient to list a dependant\'s prescriptions via patientPrescriptions()', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-a', 'dep-1']);
      prisma.prescriptions.findMany.mockResolvedValue([{ ...prescriptionOpen, patient_id: 'dep-1' }]);
      const result = await service.patientPrescriptions('dep-1', patientA);
      expect(result).toHaveLength(1);
    });

    it('rejects patientPrescriptions for a patient who is neither the caller nor a dependant', async () => {
      patientsService.ownAndDependantPatientIds.mockResolvedValue(['pat-a', 'dep-1']);
      await expect(service.patientPrescriptions('pat-x', patientA)).rejects.toThrow(NotFoundException);
      expect(prisma.prescriptions.findMany).not.toHaveBeenCalled();
    });
  });

  describe('repeatPrescription — unsaved draft, not a persisted row (US-RX-05)', () => {
    it('returns a draft shape without calling prescriptions.create', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      const result = await service.repeatPrescription('rx-1', clinicianA);
      expect(result.repeated_from_id).toBe('rx-1');
      expect(result.items[0].drug_name).toBe('Amoxicillin');
      expect(prisma.prescriptions.create).not.toHaveBeenCalled();
    });

    it('rejects repeating a cross-tenant prescription', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.repeatPrescription('rx-1', managerB)).rejects.toThrow(NotFoundException);
    });
  });

  describe('printPrescription — reprint-count / duplicate-watermark logic (US-RX-03)', () => {
    it('first fetch is the original: is_reprint false, reprint_count set to 1', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      prisma.clinicians.findUnique.mockResolvedValue({ first_name: 'Sarah', last_name: 'Mitchell', registration_number: 'REG123', qualifications: 'MBBS' });
      prisma.patients.findUnique.mockResolvedValue({ first_name: 'Anita', last_name: 'Sharma', date_of_birth: new Date('1990-01-01'), gender: 'female' });
      prisma.clientOrganizations.findUnique.mockResolvedValue({ name: 'City Heart Clinic', logo_url: null, contact_phone: '+911234567890' });
      const result = await service.printPrescription('rx-1', clinicianA);
      expect(result.is_reprint).toBe(false);
      expect(prisma.prescriptions.update).toHaveBeenCalledWith({ where: { id: 'rx-1' }, data: { reprint_count: 1 } });
    });

    it('second+ fetch is a reprint: is_reprint true, reprint_count incremented', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue({ ...prescriptionOpen, reprint_count: 1 });
      prisma.clinicians.findUnique.mockResolvedValue({ first_name: 'Sarah', last_name: 'Mitchell' });
      prisma.patients.findUnique.mockResolvedValue({ first_name: 'Anita', last_name: 'Sharma', date_of_birth: new Date('1990-01-01') });
      prisma.clientOrganizations.findUnique.mockResolvedValue({ name: 'City Heart Clinic' });
      const result = await service.printPrescription('rx-1', clinicianA);
      expect(result.is_reprint).toBe(true);
      expect(prisma.prescriptions.update).toHaveBeenCalledWith({ where: { id: 'rx-1' }, data: { reprint_count: { increment: 1 } } });
    });

    it('rejects printing a cross-tenant prescription', async () => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      await expect(service.printPrescription('rx-1', managerB)).rejects.toThrow(NotFoundException);
    });
  });

  describe('prescriptionSets / createPrescriptionSet — org write-path (US-RX-02)', () => {
    it('rejects an org-less non-operator creating a set (orgIdForWrite fails closed)', async () => {
      await expect(
        service.createPrescriptionSet({ name: 'URI adult set', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, selfRegisteredPatient),
      ).rejects.toThrow();
      expect(prisma.prescriptionSets.create).not.toHaveBeenCalled();
    });

    it('stamps clinician_id null for an org-shared set', async () => {
      prisma.prescriptionSets.create.mockResolvedValue({ id: 'set-1', items: [] });
      await service.createPrescriptionSet({ name: 'URI adult set', org_shared: true, items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, clinicianA);
      expect(prisma.prescriptionSets.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', clinician_id: null }) }),
      );
    });

    it('stamps the caller\'s own clinician_id for a personal favourite', async () => {
      prisma.prescriptionSets.create.mockResolvedValue({ id: 'set-1', items: [] });
      await service.createPrescriptionSet({ name: 'My favourite', items: [{ drug_id: 'drug-1', dose: '1', frequency: 'OD' } as any] } as any, clinicianA);
      expect(prisma.prescriptionSets.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ clinician_id: 'clin-a' }) }),
      );
    });
  });

  describe('applyPrescriptionSet — pre-fills the builder, computes qty', () => {
    it('rejects an unknown set', async () => {
      prisma.prescriptionSets.findUnique.mockResolvedValue(null);
      await expect(service.applyPrescriptionSet('missing', clinicianA)).rejects.toThrow(NotFoundException);
    });

    it('rejects a cross-org set', async () => {
      prisma.prescriptionSets.findUnique.mockResolvedValue({ id: 'set-1', client_org_id: 'org-b', items: [] });
      await expect(service.applyPrescriptionSet('set-1', clinicianA)).rejects.toThrow(NotFoundException);
    });

    it('returns items with qty computed from frequency x duration', async () => {
      prisma.prescriptionSets.findUnique.mockResolvedValue({
        id: 'set-1', client_org_id: 'org-a',
        items: [{ id: 'si-1', drug_id: 'drug-1', dose: '500mg', frequency: 'BD', duration_days: 5, route: null, instructions: null }],
      });
      const result = await service.applyPrescriptionSet('set-1', clinicianA);
      expect(result[0].qty).toBe(10);
      expect(result[0].drug_name).toBe('Amoxicillin');
    });
  });

  // REQ109
  describe('sharePrescriptionViaWhatsapp — two-channel OTP-gated delivery', () => {
    const patientWithPhone = { id: 'pat-a', first_name: 'A', last_name: 'B', phone: '+919876543289' };
    const whatsappConfig = { provider: { send: jest.fn() }, credentials: {} };
    const smsConfig = { provider: { send: jest.fn() }, credentials: {} };

    beforeEach(() => {
      prisma.prescriptions.findUnique.mockResolvedValue(prescriptionOpen);
      prisma.patients.findUnique.mockResolvedValue(patientWithPhone);
      whatsappConfig.provider.send.mockReset().mockResolvedValue({ sent: true });
      smsConfig.provider.send.mockReset().mockResolvedValue({ sent: true });
    });

    it('rejects for an unauthorized caller, delegating to the same access control as printPrescription', async () => {
      await expect(service.sharePrescriptionViaWhatsapp('rx-1', managerB)).rejects.toThrow(NotFoundException);
      expect(providerConfigService.getActiveConfigForOrg).not.toHaveBeenCalled();
    });

    it('returns success:false when no WhatsApp provider is configured', async () => {
      providerConfigService.getActiveConfigForOrg.mockResolvedValue(null);
      const result = await service.sharePrescriptionViaWhatsapp('rx-1', clinicianA);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/No WhatsApp provider/);
      expect(prisma.prescriptionShareOtps.create).not.toHaveBeenCalled();
    });

    it('returns success:false when WhatsApp is configured but SMS is not (OTP undeliverable)', async () => {
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp' ? whatsappConfig : null,
      );
      const result = await service.sharePrescriptionViaWhatsapp('rx-1', clinicianA);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toMatch(/No SMS provider/);
      expect(whatsappConfig.provider.send).not.toHaveBeenCalled();
    });

    it('sends both the WhatsApp link and the SMS OTP, and writes a PrescriptionShareOtps row', async () => {
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp' ? whatsappConfig : smsConfig,
      );
      const result = await service.sharePrescriptionViaWhatsapp('rx-1', clinicianA);
      expect(result.success).toBe(true);
      expect(result.phone_last_two).toBe('89');
      expect(whatsappConfig.provider.send).toHaveBeenCalledWith(whatsappConfig.credentials, patientWithPhone.phone, expect.stringContaining('/share/rx/'));
      expect(smsConfig.provider.send).toHaveBeenCalledWith(smsConfig.credentials, patientWithPhone.phone, expect.stringContaining('verification code'));
      expect(prisma.prescriptionShareOtps.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ prescription_id: 'rx-1', phone: patientWithPhone.phone }),
      }));
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: 'rx_share', prescriptionId: 'rx-1' }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('does not report success when the WhatsApp send itself fails', async () => {
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp' ? whatsappConfig : smsConfig,
      );
      whatsappConfig.provider.send.mockResolvedValue({ sent: false, error: 'provider down' });
      const result = await service.sharePrescriptionViaWhatsapp('rx-1', clinicianA);
      expect(result.success).toBe(false);
      expect(smsConfig.provider.send).not.toHaveBeenCalled();
    });

    it('does not report success when the link sent but the OTP SMS failed', async () => {
      providerConfigService.getActiveConfigForOrg.mockImplementation((_orgId: string, channel: string) =>
        channel === 'whatsapp' ? whatsappConfig : smsConfig,
      );
      smsConfig.provider.send.mockResolvedValue({ sent: false, error: 'provider down' });
      const result = await service.sharePrescriptionViaWhatsapp('rx-1', clinicianA);
      expect(result.success).toBe(false);
      expect(result.userErrors[0].message).toBe('provider down');
    });
  });

  // REQ109
  describe('verifyShareOtp — one-time-use, lockout, expiry', () => {
    const activeRow = { id: 'otp-1', prescription_id: 'rx-1', otp_code: '123456', attempts: 0, expires_at: new Date(Date.now() + 60_000), consumed_at: null };

    it('rejects when no matching unconsumed row exists (never distinguishable from "wrong code")', async () => {
      prisma.prescriptionShareOtps.findFirst.mockResolvedValue(null);
      await expect(service.verifyShareOtp('rx-1', '123456')).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyShareOtp('rx-1', '123456')).rejects.toThrow(/expired/);
    });

    it('rejects an expired row with the same message as no row at all', async () => {
      prisma.prescriptionShareOtps.findFirst.mockResolvedValue({ ...activeRow, expires_at: new Date(Date.now() - 1000) });
      await expect(service.verifyShareOtp('rx-1', '123456')).rejects.toThrow(/expired/);
    });

    it('rejects once attempts reach the lockout threshold', async () => {
      prisma.prescriptionShareOtps.findFirst.mockResolvedValue({ ...activeRow, attempts: 3 });
      await expect(service.verifyShareOtp('rx-1', '123456')).rejects.toThrow(/expired/);
    });

    it('increments attempts on a wrong code, distinct message, does not consume the row', async () => {
      prisma.prescriptionShareOtps.findFirst.mockResolvedValue(activeRow);
      await expect(service.verifyShareOtp('rx-1', 'wrong1')).rejects.toThrow('Incorrect code');
      expect(prisma.prescriptionShareOtps.update).toHaveBeenCalledWith({ where: { id: 'otp-1' }, data: { attempts: { increment: 1 } } });
    });

    it('consumes the row on a correct code within TTL and under the attempt limit', async () => {
      prisma.prescriptionShareOtps.findFirst.mockResolvedValue(activeRow);
      await service.verifyShareOtp('rx-1', '123456');
      expect(prisma.prescriptionShareOtps.update).toHaveBeenCalledWith({ where: { id: 'otp-1' }, data: { consumed_at: expect.any(Date) } });
    });
  });

  // REQ137 (US-INS-06) — used by InsuranceService to auto-attach a
  // claim's evidence; access control lives entirely on the caller's
  // side (this is a plain fetch on an already-authorized encounter id).
  describe('prescriptionsForEncounter', () => {
    it('fetches by encounter_id, newest first, and maps drug_name onto each item', async () => {
      prisma.prescriptions.findMany.mockResolvedValue([prescriptionOpen]);
      const result = await service.prescriptionsForEncounter('enc-1');
      expect(prisma.prescriptions.findMany).toHaveBeenCalledWith({
        where: { encounter_id: 'enc-1' },
        include: { items: true },
        orderBy: { issued_at: 'desc' },
      });
      expect(result).toEqual([{ ...prescriptionOpen, items: [{ ...rxItem, drug_name: 'Amoxicillin' }] }]);
    });

    it('returns an empty array for an encounter with no prescriptions', async () => {
      prisma.prescriptions.findMany.mockResolvedValue([]);
      const result = await service.prescriptionsForEncounter('enc-2');
      expect(result).toEqual([]);
    });
  });
});
