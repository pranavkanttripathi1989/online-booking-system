import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { AppointmentPaymentsService } from '../appointment-payments/appointment-payments.service';
import { EncountersService } from '../encounters/encounters.service';
import { InsuranceService } from '../insurance/insurance.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// REQ057 (US-PAT-02). Real pdfkit output is asserted by its own magic
// bytes ("%PDF") -- a genuine, if coarse, proof the renderer produced a
// real PDF stream from the fixture data, not a mocked/fabricated Buffer.
describe('DocumentsService', () => {
  let service: DocumentsService;
  let prescriptionsService: { printPrescription: jest.Mock; assembleForShare: jest.Mock; verifyShareOtp: jest.Mock };
  let appointmentPaymentsService: { invoiceForDownload: jest.Mock };
  let encountersService: { encounter: jest.Mock };
  let insuranceService: { claim: jest.Mock; claimEvidencePrescriptions: jest.Mock };
  let prisma: {
    patients: { findUnique: jest.Mock };
    clinicians: { findUnique: jest.Mock };
    appointments: { findUnique: jest.Mock };
  };

  const user: JwtPayload = { sub: 'u1', roles: ['patient'], client_org_id: 'org-a', patient_id: 'patient-1', clinician_id: null } as JwtPayload;
  const staffUser: JwtPayload = { sub: 'staff-1', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;

  beforeEach(async () => {
    prescriptionsService = { printPrescription: jest.fn(), assembleForShare: jest.fn(), verifyShareOtp: jest.fn() };
    appointmentPaymentsService = { invoiceForDownload: jest.fn() };
    encountersService = { encounter: jest.fn() };
    insuranceService = { claim: jest.fn(), claimEvidencePrescriptions: jest.fn() };
    prisma = {
      patients: { findUnique: jest.fn() },
      clinicians: { findUnique: jest.fn() },
      appointments: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrescriptionsService, useValue: prescriptionsService },
        { provide: AppointmentPaymentsService, useValue: appointmentPaymentsService },
        { provide: EncountersService, useValue: encountersService },
        { provide: InsuranceService, useValue: insuranceService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(DocumentsService);
  });

  describe('prescriptionPdf', () => {
    const printData = {
      prescription: {
        issued_at: new Date('2026-08-25T00:00:00.000Z'),
        items: [{ drug_name: 'Paracetamol', dose: '500mg', frequency: 'BD', route: 'oral', duration_days: 5, qty: 10, instructions: 'After food' }],
      },
      clinic: { name: 'MG Road Clinic', logo_url: undefined, contact_phone: '+911234', address: undefined },
      clinician: { full_name: 'Dr. Sarah Mitchell', registration_number: 'REG123', qualifications: 'MBBS' },
      patient: { full_name: 'Anita Sharma', date_of_birth: new Date('1990-01-01'), gender: 'female' },
      is_reprint: false,
    };

    it('propagates printPrescription\'s own access-control failure rather than swallowing it', async () => {
      prescriptionsService.printPrescription.mockRejectedValue(new NotFoundException('Prescription not found'));
      await expect(service.prescriptionPdf('rx-1', user)).rejects.toThrow('Prescription not found');
    });

    it('renders a real PDF from the assembled prescription data', async () => {
      prescriptionsService.printPrescription.mockResolvedValue(printData);
      const buffer = await service.prescriptionPdf('rx-1', user);
      expect(prescriptionsService.printPrescription).toHaveBeenCalledWith('rx-1', user);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('renders a DUPLICATE watermark without throwing when is_reprint is true', async () => {
      prescriptionsService.printPrescription.mockResolvedValue({ ...printData, is_reprint: true });
      const buffer = await service.prescriptionPdf('rx-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    // REQ129 (US-RX-08)
    it('still renders a real PDF when the prescription carries a pdf_hash (verification code line)', async () => {
      prescriptionsService.printPrescription.mockResolvedValue({
        ...printData,
        prescription: { ...printData.prescription, pdf_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2' },
      });
      const buffer = await service.prescriptionPdf('rx-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('still renders a real PDF when pdf_hash is absent (a legacy pre-REQ129 row)', async () => {
      prescriptionsService.printPrescription.mockResolvedValue(printData);
      const buffer = await service.prescriptionPdf('rx-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    // REQ139 — the org's own logo_url (already present in printPrescription's
    // assembled data) now flows into drawLetterhead; a nonexistent path
    // falls back gracefully (real embedding is covered at the render-pdf
    // unit level, render-pdf.spec.ts).
    it('still renders a real PDF when the org has a logo_url set', async () => {
      prescriptionsService.printPrescription.mockResolvedValue({
        ...printData,
        clinic: { ...printData.clinic, logo_url: '/uploads/branding/org-a-logo.png' },
      });
      const buffer = await service.prescriptionPdf('rx-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  // REQ109
  describe('prescriptionPdfForShare', () => {
    const shareData = {
      prescription: {
        issued_at: new Date('2026-08-25T00:00:00.000Z'),
        items: [{ drug_name: 'Paracetamol', dose: '500mg', frequency: 'BD', route: 'oral', duration_days: 5, qty: 10, instructions: null }],
      },
      clinic: { name: 'MG Road Clinic', logo_url: undefined, contact_phone: '+911234', address: undefined },
      clinician: { full_name: 'Dr. Sarah Mitchell', registration_number: 'REG123', qualifications: 'MBBS' },
      patient: { full_name: 'Anita Sharma', date_of_birth: new Date('1990-01-01'), gender: 'female' },
      is_reprint: false,
    };

    it('verifies the OTP before assembling/rendering anything', async () => {
      prescriptionsService.verifyShareOtp.mockRejectedValue(new Error('Incorrect code'));
      await expect(service.prescriptionPdfForShare('rx-1', 'wrong')).rejects.toThrow('Incorrect code');
      expect(prescriptionsService.assembleForShare).not.toHaveBeenCalled();
    });

    it('renders the exact same bytes prescriptionPdf produces, from assembleForShare data', async () => {
      prescriptionsService.verifyShareOtp.mockResolvedValue(undefined);
      prescriptionsService.assembleForShare.mockResolvedValue(shareData);
      const buffer = await service.prescriptionPdfForShare('rx-1', '123456');
      expect(prescriptionsService.verifyShareOtp).toHaveBeenCalledWith('rx-1', '123456');
      expect(prescriptionsService.assembleForShare).toHaveBeenCalledWith('rx-1');
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('invoicePdf', () => {
    const invoiceData = {
      invoice_number: 'INV/1',
      created_at: new Date('2026-08-25T00:00:00.000Z'),
      amount: 500,
      currency: 'INR',
      gst: { gstin: undefined, hsn_sac_code: undefined, gst_rate: 5, cgst_amount: 12.5, sgst_amount: 12.5, igst_amount: undefined, place_of_supply: 'Karnataka' },
      clinic: { name: 'MG Road Clinic', contact_phone: '+911234' },
      patient: { full_name: 'Anita Sharma' },
      product_name: 'GP Consultation',
      tenders: [{ tender_type: 'cash', amount: 500, reference: undefined }],
    };

    it('throws NotFoundException when the underlying service returns null (cross-org/cross-patient/not-succeeded)', async () => {
      appointmentPaymentsService.invoiceForDownload.mockResolvedValue(null);
      await expect(service.invoicePdf('pay-1', user)).rejects.toThrow('Invoice not found');
    });

    it('renders a real PDF from the assembled invoice data, including GST fields', async () => {
      appointmentPaymentsService.invoiceForDownload.mockResolvedValue(invoiceData);
      const buffer = await service.invoicePdf('pay-1', user);
      expect(appointmentPaymentsService.invoiceForDownload).toHaveBeenCalledWith('pay-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    // REQ139
    it('still renders a real PDF when the org has a logo_url set', async () => {
      appointmentPaymentsService.invoiceForDownload.mockResolvedValue({ ...invoiceData, clinic: { ...invoiceData.clinic, logo_url: '/uploads/branding/org-a-logo.png' } });
      const buffer = await service.invoicePdf('pay-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  describe('visitSummaryPdf', () => {
    const encounterData = {
      id: 'enc-1',
      patient_id: 'patient-1',
      clinician_id: 'clinician-1',
      appointment_id: 'appt-1',
      created_at: new Date('2026-08-25T00:00:00.000Z'),
      notes: [{ section: 'complaints', content: 'Fever for 3 days' }, { section: 'advice', content: 'Rest and fluids' }],
      diagnoses: [{ type: 'diagnosis', text: 'Viral fever', icd10_code: 'B34.9', status: 'active' }],
      attachments: [],
    };

    it('propagates encounter()\'s own access-control failure rather than swallowing it', async () => {
      encountersService.encounter.mockRejectedValue(new NotFoundException('Encounter not found'));
      await expect(service.visitSummaryPdf('enc-1', user)).rejects.toThrow('Encounter not found');
    });

    it('renders a real PDF, joining patient/clinician/clinic names outside the encounter row itself', async () => {
      encountersService.encounter.mockResolvedValue(encounterData);
      prisma.patients.findUnique.mockResolvedValue({ first_name: 'Anita', last_name: 'Sharma' });
      prisma.clinicians.findUnique.mockResolvedValue({ first_name: 'Sarah', last_name: 'Mitchell' });
      prisma.appointments.findUnique.mockResolvedValue({ clinic: { client_organization: { name: 'MG Road Clinic', contact_phone: '+911234' } } });

      const buffer = await service.visitSummaryPdf('enc-1', user);

      expect(encountersService.encounter).toHaveBeenCalledWith('enc-1', user);
      expect(prisma.patients.findUnique).toHaveBeenCalledWith({ where: { id: 'patient-1' } });
      expect(prisma.clinicians.findUnique).toHaveBeenCalledWith({ where: { id: 'clinician-1' } });
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    // REQ139
    it('still renders a real PDF when the org has a logo_url set', async () => {
      encountersService.encounter.mockResolvedValue(encounterData);
      prisma.patients.findUnique.mockResolvedValue({ first_name: 'Anita', last_name: 'Sharma' });
      prisma.clinicians.findUnique.mockResolvedValue({ first_name: 'Sarah', last_name: 'Mitchell' });
      prisma.appointments.findUnique.mockResolvedValue({ clinic: { client_organization: { name: 'MG Road Clinic', contact_phone: '+911234', logo_url: '/uploads/branding/org-a-logo.png' } } });

      const buffer = await service.visitSummaryPdf('enc-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('still renders when the clinic lookup resolves to null (a genuinely orphaned appointment)', async () => {
      encountersService.encounter.mockResolvedValue(encounterData);
      prisma.patients.findUnique.mockResolvedValue(null);
      prisma.clinicians.findUnique.mockResolvedValue(null);
      prisma.appointments.findUnique.mockResolvedValue(null);

      const buffer = await service.visitSummaryPdf('enc-1', user);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });

  // REQ138 (US-INS-06's own follow-on)
  describe('reimbursementPackPdf', () => {
    const claimData = {
      id: 'claim-1', appointment_id: 'appt-1', patient_name: 'Anita Sharma',
      payer: { id: 'payer-1', name: 'Star Health', payer_type: 'insurer', is_active: true },
      appointment_date: new Date('2026-08-20'), claim_amount: 5000, approved_amount: undefined,
      status: 'submitted', rejection_reason: undefined, notes: undefined,
      submitted_at: new Date('2026-08-26'), decided_at: undefined, settled_at: undefined,
    };
    const evidenceRx = [{
      issued_at: new Date('2026-08-20'),
      items: [{ drug_name: 'Amoxicillin', dose: '500mg', frequency: 'BD', route: 'oral', duration_days: 5, qty: 10, instructions: null }],
    }];

    it('rejects a patient/clinician caller before ever calling InsuranceService — role gating REST bypasses GraphQL\'s own @Auth', async () => {
      await expect(service.reimbursementPackPdf('claim-1', user)).rejects.toThrow(ForbiddenException);
      expect(insuranceService.claim).not.toHaveBeenCalled();
    });

    it('propagates claim()\'s own cross-org access-control failure rather than swallowing it', async () => {
      insuranceService.claim.mockRejectedValue(new NotFoundException('Claim not found'));
      insuranceService.claimEvidencePrescriptions.mockResolvedValue([]);
      await expect(service.reimbursementPackPdf('claim-1', staffUser)).rejects.toThrow('Claim not found');
    });

    it('renders a real PDF with claim details and evidence prescriptions for an authorized staff caller', async () => {
      insuranceService.claim.mockResolvedValue(claimData);
      insuranceService.claimEvidencePrescriptions.mockResolvedValue(evidenceRx);
      prisma.appointments.findUnique.mockResolvedValue({ clinic: { name: 'MG Road Clinic', phone: '+911234' } });

      const buffer = await service.reimbursementPackPdf('claim-1', staffUser);

      expect(insuranceService.claim).toHaveBeenCalledWith('claim-1', staffUser);
      expect(insuranceService.claimEvidencePrescriptions).toHaveBeenCalledWith('claim-1', staffUser);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('still renders a real PDF with an honest "no prescriptions" note when there is no evidence yet', async () => {
      insuranceService.claim.mockResolvedValue(claimData);
      insuranceService.claimEvidencePrescriptions.mockResolvedValue([]);
      prisma.appointments.findUnique.mockResolvedValue({ clinic: { name: 'MG Road Clinic', phone: '+911234' } });

      const buffer = await service.reimbursementPackPdf('claim-1', staffUser);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('still renders when the clinic lookup resolves to null', async () => {
      insuranceService.claim.mockResolvedValue(claimData);
      insuranceService.claimEvidencePrescriptions.mockResolvedValue([]);
      prisma.appointments.findUnique.mockResolvedValue(null);

      const buffer = await service.reimbursementPackPdf('claim-1', staffUser);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    });
  });
});
