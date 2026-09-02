import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { IpdInsuranceService } from './ipd-insurance.service';
import { PrismaService } from '../prisma/prisma.service';
import { IpdBillingService } from '../ipd-billing/ipd-billing.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ179 (IPD slice 5) -- TPA cashless. Every state transition is a real
// human decision point (no automated payer submission), matching
// insurance.service.ts's own CLAIM_TRANSITIONS precedent.
describe('IpdInsuranceService', () => {
  let service: IpdInsuranceService;
  let prisma: {
    clinics: { findUnique: jest.Mock };
    patients: { findUnique: jest.Mock };
    payers: { findUnique: jest.Mock };
    patientInsurancePolicies: { findUnique: jest.Mock };
    admissions: { findUnique: jest.Mock };
    preAuthorizations: { create: jest.Mock; findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock };
    preAuthEnhancements: { create: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    ipdBills: { findUnique: jest.Mock };
    ipdCharges: { findUnique: jest.Mock };
    ipdClaims: { create: jest.Mock; findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; update: jest.Mock; findMany: jest.Mock };
    ipdClaimDeductions: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock };
    ipdInsuranceDocuments: { create: jest.Mock };
    invoiceSequences: { upsert: jest.Mock };
  };
  let billingService: { recordPayment: jest.Mock };

  const orgAUser: JwtPayload = { sub: 'u1', roles: ['manager'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u2', roles: ['manager'], client_org_id: 'org-b', patient_id: null, clinician_id: null } as JwtPayload;

  const clinicA = { id: 'clinic-a', client_org_id: 'org-a', is_deleted: false };
  const patientA = { id: 'pat-a', client_org_id: 'org-a', is_deleted: false, first_name: 'Anita', last_name: 'Sharma' };
  const payerA = { id: 'payer-1', name: 'Star Health', is_active: true };
  const policyA = { id: 'policy-1', patient_id: 'pat-a' };
  const admissionA = { id: 'adm-a', client_org_id: 'org-a', clinic_id: 'clinic-a', patient_id: 'pat-a', payer_id: null, policy_id: null, is_deleted: false, admission_number: 'ADM/2026-27/00001' };

  const preauthRequested = {
    id: 'pa-1', client_org_id: 'org-a', clinic_id: 'clinic-a', patient_id: 'pat-a', payer_id: 'payer-1', policy_id: null,
    admission_id: null, status: 'requested', requested_amount_paise: 500000, approved_amount_paise: null, preauth_number: null,
    diagnosis_codes_json: null, procedure_codes_json: null, valid_until: null, rejection_reason: null, notes: null,
    requested_by_user_id: 'u1', requested_at: new Date('2026-09-01'), decided_at: null, created_at: new Date('2026-09-01'),
    patient: patientA, payer: payerA, admission: null, requested_by: { first_name: 'A', last_name: 'B' }, enhancements: [],
  };
  const preauthApprovedBound = {
    ...preauthRequested,
    id: 'pa-2',
    status: 'approved',
    approved_amount_paise: 400000,
    admission_id: 'adm-a',
    admission: admissionA,
    decided_at: new Date('2026-09-02'),
  };

  beforeEach(async () => {
    prisma = {
      clinics: { findUnique: jest.fn() },
      patients: { findUnique: jest.fn() },
      payers: { findUnique: jest.fn() },
      patientInsurancePolicies: { findUnique: jest.fn() },
      admissions: { findUnique: jest.fn() },
      preAuthorizations: { create: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
      preAuthEnhancements: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      ipdBills: { findUnique: jest.fn() },
      ipdCharges: { findUnique: jest.fn() },
      ipdClaims: { create: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      ipdClaimDeductions: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
      ipdInsuranceDocuments: { create: jest.fn() },
      invoiceSequences: { upsert: jest.fn().mockResolvedValue({ last_number: 1 }) },
    };
    billingService = { recordPayment: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpdInsuranceService,
        { provide: PrismaService, useValue: prisma },
        { provide: IpdBillingService, useValue: billingService },
      ],
    }).compile();
    service = module.get(IpdInsuranceService);
  });

  // ── createPreAuthorization ─────────────────────────────────────────────
  describe('createPreAuthorization', () => {
    const baseInput = { patient_id: 'pat-a', clinic_id: 'clinic-a', payer_id: 'payer-1', requested_amount: 5000 };

    it('rejects a cross-org clinic', async () => {
      prisma.clinics.findUnique.mockResolvedValue({ id: 'clinic-b', client_org_id: 'org-b', is_deleted: false });
      await expect(service.createPreAuthorization(baseInput as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org patient', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.patients.findUnique.mockResolvedValue({ ...patientA, client_org_id: 'org-b' });
      await expect(service.createPreAuthorization(baseInput as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a policy that does not belong to the patient', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.patients.findUnique.mockResolvedValue(patientA);
      prisma.payers.findUnique.mockResolvedValue(payerA);
      prisma.patientInsurancePolicies.findUnique.mockResolvedValue({ id: 'policy-1', patient_id: 'someone-else' });
      await expect(service.createPreAuthorization({ ...baseInput, policy_id: 'policy-1' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects an admission belonging to a different patient', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.patients.findUnique.mockResolvedValue(patientA);
      prisma.payers.findUnique.mockResolvedValue(payerA);
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, patient_id: 'someone-else' });
      await expect(service.createPreAuthorization({ ...baseInput, admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects an admission that already has a pre-authorization', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.patients.findUnique.mockResolvedValue(patientA);
      prisma.payers.findUnique.mockResolvedValue(payerA);
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.createPreAuthorization({ ...baseInput, admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(ConflictException);
    });

    it('creates a pre-authorization with no admission', async () => {
      prisma.clinics.findUnique.mockResolvedValue(clinicA);
      prisma.patients.findUnique.mockResolvedValue(patientA);
      prisma.payers.findUnique.mockResolvedValue(payerA);
      prisma.preAuthorizations.create.mockResolvedValue({ id: 'pa-new' });
      prisma.preAuthorizations.findUniqueOrThrow.mockResolvedValue(preauthRequested);

      const result = await service.createPreAuthorization(baseInput as any, orgAUser);
      expect(prisma.preAuthorizations.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ client_org_id: 'org-a', clinic_id: 'clinic-a', patient_id: 'pat-a', requested_amount_paise: 500000, admission_id: null }) }),
      );
      expect(result.status).toBe('requested');
    });
  });

  // ── updatePreAuthorizationStatus ────────────────────────────────────────
  describe('updatePreAuthorizationStatus', () => {
    it('rejects an illegal transition', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ ...preauthRequested, status: 'rejected' });
      await expect(service.updatePreAuthorizationStatus('pa-1', { status: 'approved', approved_amount: 5000 } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('requires approved_amount when approving', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.updatePreAuthorizationStatus('pa-1', { status: 'approved' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('requires rejection_reason when rejecting', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.updatePreAuthorizationStatus('pa-1', { status: 'rejected' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org pre-authorization', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.updatePreAuthorizationStatus('pa-1', { status: 'approved', approved_amount: 5000 } as any, orgBUser)).rejects.toThrow(NotFoundException);
    });

    it('approves with the given amount', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      prisma.preAuthorizations.update.mockResolvedValue({ id: 'pa-1' });
      prisma.preAuthorizations.findUniqueOrThrow.mockResolvedValue({ ...preauthRequested, status: 'approved', approved_amount_paise: 400000 });

      const result = await service.updatePreAuthorizationStatus('pa-1', { status: 'approved', approved_amount: 4000 } as any, orgAUser);
      expect(prisma.preAuthorizations.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'approved', approved_amount_paise: 400000 }) }),
      );
      expect(result.status).toBe('approved');
    });
  });

  // ── bindPreAuthorizationToAdmission ─────────────────────────────────────
  describe('bindPreAuthorizationToAdmission', () => {
    it('rejects a not-yet-approved pre-authorization', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.bindPreAuthorizationToAdmission({ preauth_id: 'pa-1', admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects an already-bound pre-authorization', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ ...preauthApprovedBound, admission_id: 'adm-old' });
      await expect(service.bindPreAuthorizationToAdmission({ preauth_id: 'pa-2', admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(ConflictException);
    });

    it('rejects an admission for a different patient', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ ...preauthRequested, status: 'approved', admission_id: null });
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, patient_id: 'someone-else' });
      await expect(service.bindPreAuthorizationToAdmission({ preauth_id: 'pa-1', admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('binds an approved, unbound pre-authorization to the matching-patient admission', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ ...preauthRequested, status: 'approved', admission_id: null });
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.preAuthorizations.updateMany.mockResolvedValue({ count: 1 });
      prisma.preAuthorizations.findUniqueOrThrow.mockResolvedValue(preauthApprovedBound);

      const result = await service.bindPreAuthorizationToAdmission({ preauth_id: 'pa-1', admission_id: 'adm-a' } as any, orgAUser);
      expect(prisma.preAuthorizations.updateMany).toHaveBeenCalledWith({ where: { id: 'pa-1', admission_id: null }, data: { admission_id: 'adm-a' } });
      expect(result.admission_id).toBe('adm-a');
    });

    it('rejects when a concurrent bind of the SAME pre-auth already won the race (updateMany matched zero rows)', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ ...preauthRequested, status: 'approved', admission_id: null });
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.preAuthorizations.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.bindPreAuthorizationToAdmission({ preauth_id: 'pa-1', admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(ConflictException);
    });

    it('translates a real unique-constraint race (a different pre-auth already bound to this admission) into a clean ConflictException', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ ...preauthRequested, status: 'approved', admission_id: null });
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.preAuthorizations.updateMany.mockRejectedValue({ code: 'P2002' });
      await expect(service.bindPreAuthorizationToAdmission({ preauth_id: 'pa-1', admission_id: 'adm-a' } as any, orgAUser)).rejects.toThrow(ConflictException);
    });
  });

  // ── requestPreAuthEnhancement ────────────────────────────────────────────
  describe('requestPreAuthEnhancement', () => {
    it('rejects a pre-authorization that is not approved and admission-bound', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.requestPreAuthEnhancement({ preauth_id: 'pa-1', requested_amount: 1000, reason: 'ICU escalation' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('snapshots the real running bill amount, not a caller-supplied value', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthApprovedBound);
      prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 380000 });
      prisma.preAuthEnhancements.findFirst.mockResolvedValue(null);
      prisma.preAuthEnhancements.create.mockResolvedValue({
        id: 'pae-1', sequence_no: 1, requested_amount_paise: 100000, approved_amount_paise: null, status: 'requested',
        bill_amount_at_request_paise: 380000, reason: 'ICU escalation', rejection_reason: null,
        requested_at: new Date(), decided_at: null, requested_by: { first_name: 'A', last_name: 'B' },
      });

      const result = await service.requestPreAuthEnhancement({ preauth_id: 'pa-2', requested_amount: 1000, reason: 'ICU escalation' } as any, orgAUser);
      expect(prisma.preAuthEnhancements.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ bill_amount_at_request_paise: 380000, sequence_no: 1 }) }),
      );
      expect(result.bill_amount_at_request).toBe(3800);
    });

    it('snapshots 0 when no bill exists yet', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthApprovedBound);
      prisma.ipdBills.findUnique.mockResolvedValue(null);
      prisma.preAuthEnhancements.findFirst.mockResolvedValue(null);
      prisma.preAuthEnhancements.create.mockResolvedValue({
        id: 'pae-1', sequence_no: 1, requested_amount_paise: 100000, approved_amount_paise: null, status: 'requested',
        bill_amount_at_request_paise: 0, reason: 'x', rejection_reason: null, requested_at: new Date(), decided_at: null, requested_by: null,
      });
      await service.requestPreAuthEnhancement({ preauth_id: 'pa-2', requested_amount: 1000, reason: 'x' } as any, orgAUser);
      expect(prisma.preAuthEnhancements.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ bill_amount_at_request_paise: 0 }) }));
    });

    it('increments sequence_no from the last existing enhancement', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthApprovedBound);
      prisma.ipdBills.findUnique.mockResolvedValue({ gross_paise: 0 });
      prisma.preAuthEnhancements.findFirst.mockResolvedValue({ sequence_no: 2 });
      prisma.preAuthEnhancements.create.mockResolvedValue({
        id: 'pae-3', sequence_no: 3, requested_amount_paise: 100000, approved_amount_paise: null, status: 'requested',
        bill_amount_at_request_paise: 0, reason: 'x', rejection_reason: null, requested_at: new Date(), decided_at: null, requested_by: null,
      });
      await service.requestPreAuthEnhancement({ preauth_id: 'pa-2', requested_amount: 1000, reason: 'x' } as any, orgAUser);
      expect(prisma.preAuthEnhancements.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sequence_no: 3 }) }));
    });
  });

  // ── decidePreAuthEnhancement ─────────────────────────────────────────────
  describe('decidePreAuthEnhancement', () => {
    const enhancementRequested = {
      id: 'pae-1', status: 'requested', approved_amount_paise: null, rejection_reason: null,
      preauth: { client_org_id: 'org-a' },
    };

    it('rejects an illegal transition', async () => {
      prisma.preAuthEnhancements.findUnique.mockResolvedValue({ ...enhancementRequested, status: 'approved' });
      await expect(service.decidePreAuthEnhancement('pae-1', { status: 'approved', approved_amount: 1000 } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('requires approved_amount when approving', async () => {
      prisma.preAuthEnhancements.findUnique.mockResolvedValue(enhancementRequested);
      await expect(service.decidePreAuthEnhancement('pae-1', { status: 'approved' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('approves with the given amount', async () => {
      prisma.preAuthEnhancements.findUnique.mockResolvedValue(enhancementRequested);
      prisma.preAuthEnhancements.update.mockResolvedValue({
        id: 'pae-1', sequence_no: 1, requested_amount_paise: 100000, approved_amount_paise: 90000, status: 'approved',
        bill_amount_at_request_paise: 0, reason: 'x', rejection_reason: null, requested_at: new Date(), decided_at: new Date(), requested_by: null,
      });
      const result = await service.decidePreAuthEnhancement('pae-1', { status: 'approved', approved_amount: 900 } as any, orgAUser);
      expect(result.status).toBe('approved');
      expect(result.approved_amount).toBe(900);
    });
  });

  // ── createIpdClaim ────────────────────────────────────────────────────
  describe('createIpdClaim', () => {
    it('rejects an admission that already has a claim', async () => {
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-existing' });
      await expect(service.createIpdClaim({ admission_id: 'adm-a', claimed_amount: 5000 } as any, orgAUser)).rejects.toThrow(ConflictException);
    });

    it('rejects when no payer is given and the admission has none', async () => {
      prisma.admissions.findUnique.mockResolvedValue(admissionA);
      prisma.ipdClaims.findUnique.mockResolvedValue(null);
      await expect(service.createIpdClaim({ admission_id: 'adm-a', claimed_amount: 5000 } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('defaults payer/policy from the admission and links an existing pre-authorization', async () => {
      const admissionWithPayer = { ...admissionA, payer_id: 'payer-1', policy_id: 'policy-1' };
      prisma.admissions.findUnique.mockResolvedValue(admissionWithPayer);
      prisma.ipdClaims.findUnique.mockResolvedValue(null);
      prisma.payers.findUnique.mockResolvedValue(payerA);
      prisma.patientInsurancePolicies.findUnique.mockResolvedValue(policyA);
      prisma.preAuthorizations.findUnique.mockResolvedValue({ id: 'pa-2' });
      prisma.ipdClaims.create.mockResolvedValue({ id: 'claim-new' });
      prisma.ipdClaims.findUniqueOrThrow.mockResolvedValue({
        id: 'claim-new', clinic_id: 'clinic-a', admission_id: 'adm-a', preauth_id: 'pa-2', payer_id: 'payer-1', policy_id: 'policy-1',
        status: 'draft', claimed_amount_paise: 500000, approved_amount_paise: null, claim_number: null, rejection_reason: null, notes: null,
        submitted_by_user_id: null, submitted_at: null, decided_at: null, settled_at: null, created_at: new Date(),
        admission: admissionWithPayer, payer: payerA, submitted_by: null, deductions: [],
      });

      const result = await service.createIpdClaim({ admission_id: 'adm-a', claimed_amount: 5000 } as any, orgAUser);
      expect(prisma.ipdClaims.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payer_id: 'payer-1', policy_id: 'policy-1', preauth_id: 'pa-2', claimed_amount_paise: 500000 }) }),
      );
      expect(result.status).toBe('draft');
    });
  });

  // ── submitIpdClaim / updateIpdClaimStatus ─────────────────────────────
  describe('submitIpdClaim', () => {
    it('rejects submitting from a non-draft status', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'submitted' });
      await expect(service.submitIpdClaim('claim-1', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('assigns a claim number and moves to submitted', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', clinic_id: 'clinic-a', status: 'draft' });
      prisma.ipdClaims.update.mockResolvedValue({ id: 'claim-1' });
      prisma.ipdClaims.findUniqueOrThrow.mockResolvedValue({
        id: 'claim-1', clinic_id: 'clinic-a', admission_id: 'adm-a', preauth_id: null, payer_id: 'payer-1', policy_id: null,
        status: 'submitted', claimed_amount_paise: 500000, approved_amount_paise: null, claim_number: 'IPC/2026-27/CLINICA/00001',
        rejection_reason: null, notes: null, submitted_by_user_id: 'u1', submitted_at: new Date(), decided_at: null, settled_at: null,
        created_at: new Date(), admission: admissionA, payer: payerA, submitted_by: null, deductions: [],
      });
      const result = await service.submitIpdClaim('claim-1', orgAUser);
      expect(result.status).toBe('submitted');
      expect(result.claim_number).toBeTruthy();
    });
  });

  describe('updateIpdClaimStatus', () => {
    it('requires approved_amount when approving', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'under_review' });
      await expect(service.updateIpdClaimStatus('claim-1', { status: 'approved' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('requires rejection_reason when rejecting', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'under_review' });
      await expect(service.updateIpdClaimStatus('claim-1', { status: 'rejected' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('approves and stores the paise-converted amount', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'under_review', approved_amount_paise: null, rejection_reason: null });
      prisma.ipdClaims.update.mockResolvedValue({ id: 'claim-1' });
      prisma.ipdClaims.findUniqueOrThrow.mockResolvedValue({
        id: 'claim-1', clinic_id: 'clinic-a', admission_id: 'adm-a', preauth_id: null, payer_id: 'payer-1', policy_id: null,
        status: 'approved', claimed_amount_paise: 500000, approved_amount_paise: 450000, claim_number: 'IPC/1', rejection_reason: null,
        notes: null, submitted_by_user_id: 'u1', submitted_at: new Date(), decided_at: new Date(), settled_at: null, created_at: new Date(),
        admission: admissionA, payer: payerA, submitted_by: null, deductions: [],
      });
      const result = await service.updateIpdClaimStatus('claim-1', { status: 'approved', approved_amount: 4500 } as any, orgAUser);
      expect(prisma.ipdClaims.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ approved_amount_paise: 450000 }) }));
      expect(result.approved_amount).toBe(4500);
    });
  });

  // ── settleIpdClaim ────────────────────────────────────────────────────
  describe('settleIpdClaim', () => {
    it('rejects settling a claim not yet approved', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'under_review' });
      await expect(service.settleIpdClaim('claim-1', { tenders: [{ tender_type: 'bank_transfer', amount: 4500 }] } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('posts a real payer_settlement payment via IpdBillingService and marks the claim settled', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'approved', admission_id: 'adm-a' });
      billingService.recordPayment.mockResolvedValue({ id: 'payment-1' });
      prisma.ipdClaims.update.mockResolvedValue({ id: 'claim-1' });
      prisma.ipdClaims.findUniqueOrThrow.mockResolvedValue({
        id: 'claim-1', clinic_id: 'clinic-a', admission_id: 'adm-a', preauth_id: null, payer_id: 'payer-1', policy_id: null,
        status: 'settled', claimed_amount_paise: 500000, approved_amount_paise: 450000, claim_number: 'IPC/1', rejection_reason: null,
        notes: null, submitted_by_user_id: 'u1', submitted_at: new Date(), decided_at: new Date(), settled_at: new Date(), created_at: new Date(),
        admission: admissionA, payer: payerA, submitted_by: null, deductions: [],
      });

      const result = await service.settleIpdClaim('claim-1', { tenders: [{ tender_type: 'bank_transfer', amount: 4500 }] } as any, orgAUser);
      expect(billingService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({ admission_id: 'adm-a', payment_type: 'payer_settlement' }),
        orgAUser,
      );
      expect(result.status).toBe('settled');
    });
  });

  // ── Deductions ────────────────────────────────────────────────────────
  describe('addIpdClaimDeduction / removeIpdClaimDeduction', () => {
    it('rejects adding a deduction to a settled claim', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'settled', admission_id: 'adm-a' });
      await expect(service.addIpdClaimDeduction({ claim_id: 'claim-1', description: 'Room rent capping', deducted_amount: 500 } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a charge belonging to a different admission', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'under_review', admission_id: 'adm-a' });
      prisma.ipdCharges.findUnique.mockResolvedValue({ id: 'charge-1', admission_id: 'adm-other' });
      await expect(
        service.addIpdClaimDeduction({ claim_id: 'claim-1', charge_id: 'charge-1', description: 'x', deducted_amount: 500 } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a deduction row', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a', status: 'under_review', admission_id: 'adm-a' });
      prisma.ipdClaimDeductions.create.mockResolvedValue({ id: 'ded-1', claim_id: 'claim-1', charge_id: null, description: 'Room rent capping', deducted_amount_paise: 50000, created_at: new Date(), charge: null });
      const result = await service.addIpdClaimDeduction({ claim_id: 'claim-1', description: 'Room rent capping', deducted_amount: 500 } as any, orgAUser);
      expect(result.deducted_amount).toBe(500);
    });

    it('rejects removing a deduction from a settled claim', async () => {
      prisma.ipdClaimDeductions.findUnique.mockResolvedValue({ id: 'ded-1', claim: { client_org_id: 'org-a', status: 'settled' } });
      await expect(service.removeIpdClaimDeduction('ded-1', orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('removes a deduction', async () => {
      prisma.ipdClaimDeductions.findUnique.mockResolvedValue({ id: 'ded-1', claim: { client_org_id: 'org-a', status: 'under_review' } });
      const result = await service.removeIpdClaimDeduction('ded-1', orgAUser);
      expect(prisma.ipdClaimDeductions.delete).toHaveBeenCalledWith({ where: { id: 'ded-1' } });
      expect(result.success).toBe(true);
    });
  });

  // ── Documents ─────────────────────────────────────────────────────────
  describe('createIpdInsuranceDocument', () => {
    it('rejects when neither preauth_id nor claim_id is given', async () => {
      await expect(service.createIpdInsuranceDocument({ document_type: 'other', file_ref: '/f', mime_type: 'image/png' } as any, orgAUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects when both preauth_id and claim_id are given', async () => {
      await expect(
        service.createIpdInsuranceDocument({ preauth_id: 'pa-1', claim_id: 'claim-1', document_type: 'other', file_ref: '/f', mime_type: 'image/png' } as any, orgAUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a document against a pre-authorization', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({ id: 'pa-1', client_org_id: 'org-a' });
      prisma.ipdInsuranceDocuments.create.mockResolvedValue({
        id: 'doc-1', preauth_id: 'pa-1', claim_id: null, document_type: 'preauth_form', file_ref: '/f', mime_type: 'application/pdf',
        notes: null, uploaded_at: new Date(), uploaded_by: { first_name: 'A', last_name: 'B' },
      });
      const result = await service.createIpdInsuranceDocument({ preauth_id: 'pa-1', document_type: 'preauth_form', file_ref: '/f', mime_type: 'application/pdf' } as any, orgAUser);
      expect(result.preauth_id).toBe('pa-1');
    });
  });

  // ── Reads / tenant isolation ─────────────────────────────────────────
  describe('reads', () => {
    it('rejects reading a cross-org pre-authorization', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue(preauthRequested);
      await expect(service.findPreAuthorization('pa-1', orgBUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects reading a cross-org claim', async () => {
      prisma.ipdClaims.findUnique.mockResolvedValue({ id: 'claim-1', client_org_id: 'org-a' });
      await expect(service.findIpdClaim('claim-1', orgBUser)).rejects.toThrow(NotFoundException);
    });
  });

  // ── authorized_total derivation ────────────────────────────────────────
  describe('authorized_total', () => {
    it('sums the pre-auth approved amount with only APPROVED enhancements, never requested/rejected ones', async () => {
      prisma.preAuthorizations.findUnique.mockResolvedValue({
        ...preauthApprovedBound,
        enhancements: [
          { id: 'e1', sequence_no: 1, status: 'approved', approved_amount_paise: 50000, requested_amount_paise: 50000, bill_amount_at_request_paise: 0, reason: 'x', rejection_reason: null, requested_at: new Date(), decided_at: new Date(), requested_by: null },
          { id: 'e2', sequence_no: 2, status: 'requested', approved_amount_paise: null, requested_amount_paise: 30000, bill_amount_at_request_paise: 0, reason: 'x', rejection_reason: null, requested_at: new Date(), decided_at: null, requested_by: null },
          { id: 'e3', sequence_no: 3, status: 'rejected', approved_amount_paise: null, requested_amount_paise: 20000, bill_amount_at_request_paise: 0, reason: 'x', rejection_reason: 'no', requested_at: new Date(), decided_at: new Date(), requested_by: null },
        ],
      });
      const result = await service.findPreAuthorization('pa-2', orgAUser);
      // 400000 (approved_amount_paise) + 50000 (only e1) = 450000 paise = 4500 rupees
      expect(result.authorized_total).toBe(4500);
    });
  });
});
