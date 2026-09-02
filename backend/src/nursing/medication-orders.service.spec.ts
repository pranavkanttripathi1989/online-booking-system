import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MedicationOrdersService } from './medication-orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

describe('MedicationOrdersService', () => {
  let service: MedicationOrdersService;
  let prisma: any;

  const clinicianUser: JwtPayload = { sub: 'u1', roles: ['clinician'], client_org_id: 'org-a', patient_id: null, clinician_id: 'clin-a' } as JwtPayload;
  const staffUser: JwtPayload = { sub: 'u2', roles: ['staff'], client_org_id: 'org-a', patient_id: null, clinician_id: null } as JwtPayload;
  const orgBUser: JwtPayload = { sub: 'u3', roles: ['clinician'], client_org_id: 'org-b', patient_id: null, clinician_id: 'clin-b' } as JwtPayload;

  const admissionA = { id: 'adm-a', client_org_id: 'org-a', clinic_id: 'clinic-a', is_deleted: false, status: 'admitted' };
  const drugA = { id: 'drug-a', is_deleted: false };
  const orderA = {
    id: 'order-1',
    client_org_id: 'org-a',
    admission_id: 'adm-a',
    drug_id: 'drug-a',
    status: 'active',
    is_prn: false,
    is_high_alert: false,
  };

  beforeEach(async () => {
    prisma = {
      admissions: { findUnique: jest.fn() },
      drugs: { findUnique: jest.fn() },
      ipdMedicationOrders: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      medicationAdministrations: { updateMany: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedicationOrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(MedicationOrdersService);
    prisma.admissions.findUnique.mockResolvedValue(admissionA);
    prisma.drugs.findUnique.mockResolvedValue(drugA);
  });

  describe('create', () => {
    const validInput = { admission_id: 'adm-a', drug_id: 'drug-a', dose: '500mg', route: 'po', frequency: 'BD', schedule_times: ['08:00', '20:00'] };

    it('rejects a cross-org admission', async () => {
      await expect(service.create(validInput as any, orgBUser)).rejects.toThrow(NotFoundException);
      expect(prisma.ipdMedicationOrders.create).not.toHaveBeenCalled();
    });

    it('rejects a non-clinician caller', async () => {
      await expect(service.create(validInput as any, staffUser)).rejects.toThrow(BadRequestException);
      expect(prisma.ipdMedicationOrders.create).not.toHaveBeenCalled();
    });

    it('rejects a non-PRN order with no schedule times', async () => {
      await expect(
        service.create({ admission_id: 'adm-a', drug_id: 'drug-a', dose: '500mg', route: 'po', frequency: 'BD' } as any, clinicianUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects ordering for a discharged admission', async () => {
      prisma.admissions.findUnique.mockResolvedValue({ ...admissionA, status: 'discharged' });
      await expect(service.create(validInput as any, clinicianUser)).rejects.toThrow(BadRequestException);
    });

    it('stamps ordered_by_clinician_id from the caller, never a client-supplied argument', async () => {
      prisma.ipdMedicationOrders.create.mockResolvedValue({ id: 'order-1' });
      await service.create(validInput as any, clinicianUser);
      expect(prisma.ipdMedicationOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ordered_by_clinician_id: 'clin-a' }) }),
      );
    });

    it('allows a PRN order with no schedule times', async () => {
      prisma.ipdMedicationOrders.create.mockResolvedValue({ id: 'order-2' });
      await service.create(
        { admission_id: 'adm-a', drug_id: 'drug-a', dose: '1 tab', route: 'po', frequency: 'SOS', is_prn: true, prn_indication: 'pain' } as any,
        clinicianUser,
      );
      expect(prisma.ipdMedicationOrders.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ is_prn: true, schedule_times_json: undefined }) }),
      );
    });
  });

  describe('hold / resume', () => {
    it('rejects holding an order that is not active', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue({ ...orderA, status: 'held' });
      await expect(service.hold({ order_id: 'order-1', reason: 'NPO' } as any, staffUser)).rejects.toThrow(BadRequestException);
    });

    it('rejects a cross-org order', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue({ ...orderA, client_org_id: 'org-b' });
      await expect(service.hold({ order_id: 'order-1', reason: 'NPO' } as any, staffUser)).rejects.toThrow();
    });

    it('holds an active order with a reason', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue(orderA);
      prisma.ipdMedicationOrders.update.mockResolvedValue({ ...orderA, status: 'held', hold_reason: 'NPO' });
      await service.hold({ order_id: 'order-1', reason: 'NPO' } as any, staffUser);
      expect(prisma.ipdMedicationOrders.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'held', hold_reason: 'NPO' } }),
      );
    });

    it('rejects resuming an order that is not held', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue(orderA);
      await expect(service.resume('order-1', staffUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('stop', () => {
    it('rejects stopping an already-stopped order', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue({ ...orderA, status: 'stopped' });
      await expect(service.stop({ order_id: 'order-1' } as any, staffUser)).rejects.toThrow(BadRequestException);
    });

    it('marks future scheduled doses as not_available, not deleted', async () => {
      prisma.ipdMedicationOrders.findUnique.mockResolvedValue(orderA);
      prisma.ipdMedicationOrders.update.mockResolvedValue({ ...orderA, status: 'stopped' });
      await service.stop({ order_id: 'order-1', reason: 'Course complete' } as any, staffUser);
      expect(prisma.medicationAdministrations.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ order_id: 'order-1', status: 'scheduled' }),
          data: { status: 'not_available', hold_reason: 'Order stopped' },
        }),
      );
    });
  });

  describe('findAllForAdmission', () => {
    it('rejects a cross-org admission', async () => {
      await expect(service.findAllForAdmission('adm-a', false, orgBUser)).rejects.toThrow(NotFoundException);
    });

    it('filters to active+held when activeOnly is set', async () => {
      await service.findAllForAdmission('adm-a', true, staffUser);
      expect(prisma.ipdMedicationOrders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: { in: ['active', 'held'] } }) }),
      );
    });
  });
});
